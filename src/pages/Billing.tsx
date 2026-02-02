import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Receipt, TrendingUp, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UsageDisplay } from '@/components/billing/UsageDisplay';
import { useBilling } from '@/contexts/BillingContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  payment_type: 'one_time' | 'subscription';
  created_at: string;
}

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { 
    subscription, 
    usage,
    access,
    hasActiveSubscription,
    isCanceled,
    hasUsageLimits,
    openCustomerPortal, 
    loading: billingLoading,
    refreshBillingStatus 
  } = useBilling();
  const { toast } = useToast();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success === 'true') {
      toast({
        title: 'Payment Successful!',
        description: 'Thank you for your purchase. Your account has been updated.',
      });
      refreshBillingStatus();
      navigate('/billing', { replace: true });
    }

    if (canceled === 'true') {
      toast({
        title: 'Payment Canceled',
        description: 'Your payment was canceled. No charges were made.',
        variant: 'destructive',
      });
      navigate('/billing', { replace: true });
    }
  }, [success, canceled, toast, navigate, refreshBillingStatus]);

  useEffect(() => {
    async function fetchPayments() {
      if (!user) return;
      
      setLoadingPayments(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setPayments(data);
      }
      setLoadingPayments(false);
    }

    fetchPayments();
  }, [user]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="outline" className="text-success border-success">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing</h1>
            <p className="text-muted-foreground">Manage your subscription and usage</p>
          </div>
          {subscription && ['active', 'trialing'].includes(subscription.status) && (
            <Badge variant={isCanceled ? 'outline' : 'secondary'} className="gap-1">
              <CheckCircle2 className={`w-4 h-4 ${isCanceled ? 'text-muted-foreground' : 'text-success'}`} />
              {access?.planId === 'starter' ? 'Starter' : access?.planId === 'professional' ? 'Professional' : 'Active'} Plan
              {isCanceled && ' (Canceling)'}
            </Badge>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {hasUsageLimits && <UsageDisplay variant="full" />}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription && ['active', 'trialing'].includes(subscription.status) ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium capitalize">{access?.planId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={isCanceled ? 'outline' : subscription.status === 'active' ? 'default' : 'secondary'}>
                        {isCanceled ? 'Canceling' : subscription.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isCanceled ? 'Access ends on' : 'Next billing date'}
                      </p>
                      <p className="font-medium">
                        {subscription.currentPeriodEnd && 
                          format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">
                        £{access?.planId === 'starter' ? '99' : access?.planId === 'professional' ? '249' : '0'}/month
                      </p>
                    </div>
                  </div>

                  {isCanceled && (
                    <div className="p-3 rounded-lg bg-warning/10 text-warning-foreground text-sm">
                      <p className="font-medium">Subscription scheduled to cancel</p>
                      <p>You'll retain access until {subscription.currentPeriodEnd && format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}. You can reactivate anytime before then.</p>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>{isCanceled ? 'Reactivate Subscription' : 'Manage Subscription'}</span>
                          <ExternalLink className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                    
                    {access?.planId === 'starter' && !isCanceled && (
                      <Button className="w-full" onClick={() => navigate('/pricing')}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Upgrade to Professional
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    No active subscription. Choose a plan to start analysing legal packs.
                  </p>
                  <Button onClick={() => navigate('/pricing')}>
                    View Pricing Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Payment History
            </CardTitle>
            <CardDescription>View your recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payment history yet</p>
                <p className="text-sm mt-1">Your transactions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_type === 'subscription' 
                          ? 'Pro Plan - Monthly' 
                          : 'Single Report'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-foreground">
                        {formatAmount(payment.amount, payment.currency)}
                      </span>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {subscription && ['active', 'trialing'].includes(subscription.status) && (
          <Card className="border-muted">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground text-center">
                Need help with billing? Contact our{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/support')}>
                  support team
                </Button>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
