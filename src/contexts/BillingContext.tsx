import { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { checkTrialActive, calculateDaysRemaining } from '@/lib/utils/dateUtils';

type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | 'paused';
type PlanId = 'trial' | 'starter' | 'professional' | 'expired';

interface UserAccess {
  hasAccess: boolean;
  isTrial: boolean;
  planId: PlanId;
  usageCount: number;
  usageLimit: number;
  usageRemaining: number;
  periodEndsAt: string | null;
}

interface TrialInfo {
  endsAt: string | null;
  usageCount: number;
  usageLimit: number;
  usageRemaining: number;
  daysRemaining: number;
  creditsTotal?: number;
  creditsUsed?: number;
  creditsRemaining?: number;
}

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  periodEndsAt: string | null;
}

interface Subscription {
  id: string;
  status: SubscriptionStatus;
  planId: PlanId | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  usageCount: number;
  usageLimit: number;
}

interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
  usageLimit: number;
  features: string[];
}

interface BillingState {
  access: UserAccess | null;
  trial: TrialInfo | null;
  subscription: Subscription | null;
  usage: UsageInfo | null;
  plans: Plan[];
  loading: boolean;
  error: string | null;
}

interface BillingContextType extends BillingState {
  createCheckout: (mode: 'payment' | 'subscription', reportId?: string, planId?: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  refreshBillingStatus: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  initializeTrial: () => Promise<void>;
  hasActiveSubscription: boolean;
  isCanceled: boolean;
  canProcessReport: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPaidPlan: boolean;
  shouldShowUpgradePrompt: boolean;
  checkReportPaymentStatus: (reportId: string) => Promise<boolean>;
  isNearLimit: boolean;
  isAtLimit: boolean;
  hasUsageLimits: boolean;
}

const BillingContext = createContext<BillingContextType | null>(null);

const API_URL = import.meta.env.VITE_BACKEND_URL;

function subscribeToVisibility(callback: () => void) {
  document.addEventListener('visibilitychange', callback);
  window.addEventListener('focus', callback);
  return () => {
    document.removeEventListener('visibilitychange', callback);
    window.removeEventListener('focus', callback);
  };
}

function getVisibilitySnapshot() {
  return document.visibilityState === 'visible';
}

function getServerVisibilitySnapshot() {
  return true;
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [state, setState] = useState<BillingState>({
    access: null,
    trial: null,
    subscription: null,
    usage: null,
    plans: [],
    loading: true,
    error: null
  });

  const isVisible = useSyncExternalStore(
    subscribeToVisibility,
    getVisibilitySnapshot,
    getServerVisibilitySnapshot
  );

  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }, [session?.access_token]);

  const refreshBillingStatus = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const data = await fetchWithAuth('/billing/status');

      const hasSubscription = data.subscription && ['active', 'trialing', 'past_due'].includes(data.subscription.status);
      
      if (hasSubscription) {
        const sub = data.subscription;
        const usageLimit = sub.usageLimit ?? (sub.planId === 'starter' ? 100 : sub.planId === 'professional' ? 300 : 0);
        const usageCount = sub.usageCount ?? 0;
        const usageRemaining = Math.max(0, usageLimit - usageCount);

        const subscriptionData: Subscription = {
          id: sub.id,
          status: sub.status,
          planId: sub.planId || 'starter',
          currentPeriodStart: sub.currentPeriodStart || null,
          currentPeriodEnd: sub.currentPeriodEnd || null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
          canceledAt: sub.canceledAt || null,
          usageCount,
          usageLimit
        };

        setState(prev => ({
          ...prev,
          access: {
            hasAccess: usageRemaining > 0,
            isTrial: false,
            planId: sub.planId || 'starter',
            usageCount,
            usageLimit,
            usageRemaining,
            periodEndsAt: sub.currentPeriodEnd
          },
          trial: null,
          subscription: subscriptionData,
          usage: {
            used: usageCount,
            limit: usageLimit,
            remaining: usageRemaining,
            percentUsed: usageLimit > 0 ? Math.round((usageCount / usageLimit) * 100) : 0,
            periodEndsAt: sub.currentPeriodEnd
          },
          loading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          access: data.access,
          trial: data.trial,
          subscription: data.subscription,
          usage: data.usage,
          loading: false,
          error: null
        }));
      }
    } catch (error) {
      try {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch billing status';
        setState(prev => ({ ...prev, error: errorMessage }));
        
        const { data: customer } = await supabase
          .from('customers')
          .select('trial_started_at, trial_ends_at, trial_usage_count, trial_usage_limit, current_plan_id')
          .eq('id', user.id)
          .maybeSingle();

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscription) {
          const usageLimit = subscription.usage_limit ?? (subscription.plan_id === 'starter' ? 100 : subscription.plan_id === 'professional' ? 300 : 0);
          const usageCount = subscription.usage_count ?? 0;
          const usageRemaining = Math.max(0, usageLimit - usageCount);
          
          const usageInfo: UsageInfo = {
            used: usageCount,
            limit: usageLimit,
            remaining: usageRemaining,
            percentUsed: usageLimit > 0 ? Math.round((usageCount / usageLimit) * 100) : 0,
            periodEndsAt: subscription.current_period_end
          };

          const subscriptionData: Subscription = {
            id: subscription.id,
            status: subscription.status as SubscriptionStatus,
            planId: subscription.plan_id as PlanId || null,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            canceledAt: subscription.canceled_at || null,
            usageCount,
            usageLimit
          };

          setState(prev => ({
            ...prev,
            access: {
              hasAccess: usageRemaining > 0,
              isTrial: false,
              planId: subscription.plan_id as PlanId || 'starter',
              usageCount,
              usageLimit,
              usageRemaining,
              periodEndsAt: subscription.current_period_end
            },
            trial: null,
            subscription: subscriptionData,
            usage: usageInfo,
            loading: false,
            error: null
          }));
        } else if (customer) {
          const trialActive = checkTrialActive(customer.trial_ends_at);
          const usageCount = customer.trial_usage_count ?? 0;
          const usageLimit = customer.trial_usage_limit ?? 3;
          const usageRemaining = Math.max(0, usageLimit - usageCount);
          const daysRemaining = calculateDaysRemaining(customer.trial_ends_at);

          const trialUsageInfo: UsageInfo | null = trialActive ? {
            used: usageCount,
            limit: usageLimit,
            remaining: usageRemaining,
            percentUsed: usageLimit > 0 ? Math.round((usageCount / usageLimit) * 100) : 0,
            periodEndsAt: customer.trial_ends_at
          } : null;

          setState(prev => ({
            ...prev,
            access: {
              hasAccess: trialActive && usageRemaining > 0,
              isTrial: trialActive,
              planId: trialActive ? 'trial' : 'expired',
              usageCount,
              usageLimit,
              usageRemaining,
              periodEndsAt: customer.trial_ends_at
            },
            trial: trialActive ? {
              endsAt: customer.trial_ends_at,
              usageCount,
              usageLimit,
              usageRemaining,
              daysRemaining
            } : null,
            subscription: null,
            usage: trialUsageInfo,
            loading: false,
            error: null
          }));
        } else {
          const { error: rpcError } = await supabase.rpc('initialize_user_trial', { p_user_id: user.id });
          
          if (!rpcError) {
            const { data: newCustomer } = await supabase
              .from('customers')
              .select('trial_started_at, trial_ends_at, trial_usage_count, trial_usage_limit, current_plan_id')
              .eq('id', user.id)
              .maybeSingle();
            
            if (newCustomer) {
              const trialActive = checkTrialActive(newCustomer.trial_ends_at);
              const usageCount = newCustomer.trial_usage_count ?? 0;
              const usageLimit = newCustomer.trial_usage_limit ?? 3;
              const usageRemaining = Math.max(0, usageLimit - usageCount);
              const daysRemaining = calculateDaysRemaining(newCustomer.trial_ends_at);

              setState(prev => ({
                ...prev,
                access: {
                  hasAccess: trialActive && usageRemaining > 0,
                  isTrial: trialActive,
                  planId: trialActive ? 'trial' : 'expired',
                  usageCount,
                  usageLimit,
                  usageRemaining,
                  periodEndsAt: newCustomer.trial_ends_at
                },
                trial: trialActive ? {
                  endsAt: newCustomer.trial_ends_at,
                  usageCount,
                  usageLimit,
                  usageRemaining,
                  daysRemaining
                } : null,
                subscription: null,
                usage: trialActive ? {
                  used: usageCount,
                  limit: usageLimit,
                  remaining: usageRemaining,
                  percentUsed: usageLimit > 0 ? Math.round((usageCount / usageLimit) * 100) : 0,
                  periodEndsAt: newCustomer.trial_ends_at
                } : null,
                loading: false,
                error: null
              }));
              return;
            }
          }

          setState(prev => ({
            ...prev,
            access: {
              hasAccess: false,
              isTrial: false,
              planId: 'expired',
              usageCount: 0,
              usageLimit: 0,
              usageRemaining: 0,
              periodEndsAt: null
            },
            trial: null,
            subscription: null,
            usage: null,
            loading: false,
            error: null
          }));
        }
      } catch (fallbackError) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Failed to load billing status'
        }));
      }
    }
  }, [user, fetchWithAuth]);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/billing/plans`);
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, plans: data.plans || [] }));
        return;
      }
    } catch (_) { void _; }
    
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (plans) {
      setState(prev => ({
        ...prev,
        plans: plans.map(p => ({
          id: p.id as PlanId,
          name: p.name,
          description: p.description || '',
          priceMonthly: p.price_monthly,
          currency: p.currency || 'gbp',
          usageLimit: p.usage_limit,
          features: Array.isArray(p.features) ? (p.features as string[]) : []
        }))
      }));
    }
  }, []);

  const initializeTrial = useCallback(async () => {
    try {
      await fetchWithAuth('/billing/initialize-trial', { method: 'POST' });
      await refreshBillingStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize trial';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [fetchWithAuth, refreshBillingStatus]);

  const createCheckout = useCallback(async (mode: 'payment' | 'subscription', reportId?: string, planId?: string) => {
    try {
      const data = await fetchWithAuth('/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ mode, reportId, planId }),
      });

      if (!data.url) {
        throw new Error('No checkout URL received');
      }

      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [fetchWithAuth]);

  const openCustomerPortal = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/stripe/portal', {
        method: 'POST',
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open customer portal';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [fetchWithAuth]);

  const checkReportPaymentStatus = useCallback(async (reportId: string): Promise<boolean> => {
    if (!user) return false;

    const { data: report } = await supabase
      .from('reports')
      .select('payment_status')
      .eq('id', reportId)
      .single();

    if (report?.payment_status === 'paid') {
      return true;
    }

    if (state.access?.hasAccess) {
      return true;
    }

    return false;
  }, [user, state.access?.hasAccess]);

  useEffect(() => {
    if (user) {
      refreshBillingStatus();
      fetchPlans();
    } else {
      setState({
        access: null,
        trial: null,
        subscription: null,
        usage: null,
        plans: [],
        loading: false,
        error: null
      });
    }
  }, [user, refreshBillingStatus, fetchPlans]);

  useEffect(() => {
    if (user && isVisible) {
      refreshBillingStatus();
    }
  }, [user, isVisible, refreshBillingStatus]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`billing-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => refreshBillingStatus()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${user.id}`
        },
        () => refreshBillingStatus()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'usage_records',
          filter: `user_id=eq.${user.id}`
        },
        () => refreshBillingStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshBillingStatus]);

  const hasActiveSubscription = Boolean(
    state.subscription && 
    ['active', 'trialing'].includes(state.subscription.status) &&
    !state.subscription.cancelAtPeriodEnd
  );
  const isCanceled = Boolean(
    state.subscription && 
    (state.subscription.status === 'canceled' || state.subscription.cancelAtPeriodEnd)
  );
  const hasValidSubscription = Boolean(
    state.subscription && 
    ['active', 'trialing'].includes(state.subscription.status)
  );
  const isTrialActive = Boolean(state.access?.isTrial && state.access?.hasAccess && !hasValidSubscription);
  const isTrialExpired = !hasValidSubscription && !isTrialActive && state.access?.planId === 'expired';
  const isPaidPlan = hasValidSubscription || state.access?.planId === 'starter' || state.access?.planId === 'professional';
  const canProcessReport = state.access?.hasAccess ?? false;
  const shouldShowUpgradePrompt = !hasValidSubscription && (isTrialExpired || (isTrialActive && (state.access?.usageRemaining ?? 0) === 0));
  
  const hasUsageLimits = state.usage !== null && state.usage.limit > 0;
  const isNearLimit = hasUsageLimits && state.usage!.percentUsed >= 80;
  const isAtLimit = hasUsageLimits && state.usage!.remaining === 0;

  return (
    <BillingContext.Provider value={{
      ...state,
      createCheckout,
      openCustomerPortal,
      refreshBillingStatus,
      fetchPlans,
      initializeTrial,
      hasActiveSubscription,
      isCanceled,
      canProcessReport,
      isTrialActive: isTrialActive ?? false,
      isTrialExpired: isTrialExpired ?? false,
      isPaidPlan: isPaidPlan ?? false,
      shouldShowUpgradePrompt: shouldShowUpgradePrompt ?? false,
      checkReportPaymentStatus,
      isNearLimit,
      isAtLimit,
      hasUsageLimits
    }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}
