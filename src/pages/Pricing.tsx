import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, HelpCircle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PricingCard } from '@/components/billing/PricingCard';
import { useBilling } from '@/contexts/BillingContext';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How does the free trial work?',
    answer: 'When you sign up, you get a 14-day free trial with 3 property reports - no credit card required. This lets you experience the full power of our AI-powered legal pack analysis before committing to a plan.'
  },
  {
    question: 'What happens after my trial ends?',
    answer: 'After your trial ends, or once you\'ve used all 3 trial reports, you\'ll need to upgrade to a paid plan to continue analyzing properties. Your existing reports remain accessible.'
  },
  {
    question: 'What counts as an analysis?',
    answer: 'Each legal pack you upload and process counts as one analysis. You can view and re-access completed reports unlimited times without using additional usage.'
  },
  {
    question: 'When does my usage reset?',
    answer: 'Your usage resets on your monthly billing date. If you subscribed on the 15th, your usage resets on the 15th of each month.'
  },
  {
    question: 'What happens if I hit my limit?',
    answer: 'You won\'t be able to process new legal packs until your next billing cycle or you upgrade to a higher plan. Your existing reports remain accessible.'
  },
  {
    question: 'Can I upgrade mid-month?',
    answer: 'Yes! Upgrading immediately increases your limit. You\'ll be charged the prorated difference for the remainder of your billing period.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time through the billing portal. Your subscription will remain active until the end of your current billing period.'
  },
  {
    question: 'Is my payment information secure?',
    answer: 'Yes, all payments are processed securely through Stripe. We never store your card details on our servers. Stripe is PCI-DSS Level 1 certified, the highest level of security certification.'
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createCheckout, plans, fetchPlans, hasActiveSubscription, isPaidPlan, access, loading } = useBilling();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const upgraded = searchParams.get('upgraded');
  const upgrading = searchParams.get('upgrading');
  const plan = searchParams.get('plan');

  useEffect(() => {
    const loadPlans = async () => {
      setPlansLoading(true);
      await fetchPlans();
      setPlansLoading(false);
    };
    loadPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (upgrading === 'true') {
      toast({
        title: 'Upgrade In Progress',
        description: 'Your payment is being processed. Your plan will update automatically once payment is confirmed.',
      });
      navigate('/pricing', { replace: true });
    } else if (upgraded === 'true' && plan) {
      const planName = plan === 'starter' ? 'Starter' : plan === 'professional' ? 'Professional' : plan;
      toast({
        title: 'Plan Updated Successfully!',
        description: `You've been upgraded to the ${planName} plan. Your new usage limit is now active.`,
      });
      navigate('/pricing', { replace: true });
    } else if (success === 'true') {
      toast({
        title: 'Payment Successful!',
        description: 'Thank you for subscribing. You now have unlimited access.',
      });
      navigate('/pricing', { replace: true });
    }

    if (canceled === 'true') {
      toast({
        title: 'Payment Canceled',
        description: 'Your payment was canceled. No charges were made.',
        variant: 'destructive',
      });
      navigate('/pricing', { replace: true });
    }
  }, [success, canceled, upgraded, upgrading, plan, navigate, toast]);

  const handleSelectPlan = async (planId: string) => {
    setProcessingPlan(planId);
    try {
      await createCheckout('subscription', undefined, planId);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const formatPrice = (priceInPence: number) => {
    return (priceInPence / 100).toFixed(0);
  };

  const starterPlan = plans.find(p => p.id === 'starter');
  const professionalPlan = plans.find(p => p.id === 'professional');

  const starterFeatures = starterPlan?.features.map(f => ({ text: f, included: true })) || [
    { text: '50 legal pack analyses per month', included: true },
    { text: 'AI-powered document review', included: true },
    { text: 'Risk assessment scoring', included: true },
    { text: 'Document chat assistant', included: true },
    { text: 'Email support', included: true },
  ];

  const professionalFeatures = professionalPlan?.features.map(f => ({ text: f, included: true })) || [
    { text: '150 legal pack analyses per month', included: true },
    { text: 'Everything in Starter', included: true },
    { text: 'Priority support', included: true },
    { text: 'Advanced analytics', included: true },
    { text: 'Bulk upload support', included: true },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start with a free trial - no credit card required. Then choose the plan that
            works best for your practice. Unlimited property analysis for a flat monthly fee.
          </p>
        </div>

        {plansLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <PricingCard
              title={starterPlan?.name || 'Starter'}
              description={starterPlan?.description || 'Perfect for growing practices'}
              price={starterPlan ? Number(formatPrice(starterPlan.priceMonthly)) : 99}
              period="month"
              features={starterFeatures}
              buttonText={
                isPaidPlan && access?.planId === 'starter' 
                  ? 'Current Plan' 
                  : isPaidPlan && access?.planId === 'professional'
                    ? 'Contact Support'
                    : 'Subscribe Now'
              }
              onSelect={() => handleSelectPlan('starter')}
              loading={processingPlan === 'starter'}
              disabled={loading || processingPlan !== null || isPaidPlan}
              isCurrentPlan={isPaidPlan && access?.planId === 'starter'}
            />

            <PricingCard
              title={professionalPlan?.name || 'Professional'}
              description={professionalPlan?.description || 'For busy solicitors and teams'}
              price={professionalPlan ? Number(formatPrice(professionalPlan.priceMonthly)) : 249}
              period="month"
              features={professionalFeatures}
              isPopular={!isPaidPlan || access?.planId !== 'professional'}
              buttonText={
                isPaidPlan && access?.planId === 'professional' 
                  ? 'Current Plan' 
                  : isPaidPlan && access?.planId === 'starter'
                    ? 'Upgrade'
                    : 'Subscribe Now'
              }
              onSelect={() => handleSelectPlan('professional')}
              loading={processingPlan === 'professional'}
              disabled={loading || processingPlan !== null || (isPaidPlan && access?.planId === 'professional')}
              isCurrentPlan={isPaidPlan && access?.planId === 'professional'}
            />
          </div>
        )}

        <div className="bg-muted/30 rounded-xl p-8">
          <h3 className="text-lg font-semibold mb-4">All plans include:</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Monthly usage reset on billing date',
              'Comprehensive legal review',
              'Risk scoring & assessment',
              'AI-powered recommendations',
              'Document chat assistant',
              'Secure data handling'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary/5 rounded-xl p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Start Your Free Trial</h3>
          <p className="text-muted-foreground mb-4">
            Get 3 free property reports over 14 days. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-success" /> No credit card
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-success" /> 3 free reports
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-success" /> Full access
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </DashboardLayout>
  );
}
