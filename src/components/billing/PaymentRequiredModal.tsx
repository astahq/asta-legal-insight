import { Link, useNavigate } from 'react-router-dom';
import { Clock, Zap, Crown, AlertCircle, ArrowRight, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/contexts/BillingContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PaymentRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId?: string;
}

export function PaymentRequiredModal({
  open,
  onOpenChange,
}: PaymentRequiredModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    trial,
    usage,
    isTrialActive,
    isTrialExpired,
    isAtLimit,
    access,
    createCheckout,
  } = useBilling();

  const isTrialUsageExhausted = isTrialActive && (trial?.usageRemaining ?? 0) === 0;
  const isUsageLimitReached = isAtLimit && !isTrialActive;

  const getTitle = () => {
    if (isTrialExpired) return 'Trial Expired';
    if (isTrialUsageExhausted) return 'Trial Reports Used';
    if (isUsageLimitReached) return 'Monthly Limit Reached';
    return 'Upgrade Required';
  };

  const getDescription = () => {
    if (isTrialExpired) {
      return 'Your 14-day free trial has ended. Subscribe now to continue analyzing properties.';
    }
    if (isTrialUsageExhausted) {
      return `You've used all ${trial?.usageLimit || 3} trial reports. Upgrade now to continue.`;
    }
    if (isUsageLimitReached) {
      const resetText = usage?.periodEndsAt 
        ? formatDistanceToNow(new Date(usage.periodEndsAt), { addSuffix: true })
        : 'soon';
      return `You've used all ${usage?.limit} analyses included in your ${access?.planId === 'starter' ? 'Starter' : 'Professional'} plan this month. Your limit resets ${resetText}.`;
    }
    return 'Subscribe to a plan to start analysing legal packs.';
  };

  const getIcon = () => {
    if (isTrialExpired) return <Clock className="w-5 h-5 text-destructive" />;
    if (isTrialUsageExhausted) return <Zap className="w-5 h-5 text-warning" />;
    if (isUsageLimitReached) return <AlertCircle className="w-5 h-5 text-destructive" />;
    return <AlertCircle className="w-5 h-5 text-warning" />;
  };

  const handleSelectPlan = async (planId: 'starter' | 'professional') => {
    try {
      await createCheckout('subscription', undefined, planId);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewPricing = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isUsageLimitReached && access?.planId === 'starter' ? (
            // Show upgrade to Professional only
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Upgrade to Professional</h4>
                  <p className="text-sm text-muted-foreground">Get 3x more analyses per month</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">£249</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-success" />
                  150 legal pack analyses per month
                </li>
                <li className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-success" />
                  Priority support
                </li>
              </ul>
              <Button onClick={() => handleSelectPlan('professional')} className="w-full">
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            // Show both plans for trial users or new users
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Starter</h4>
                    <p className="text-sm text-muted-foreground">Perfect for growing practices</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">£99</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-success" />
                    50 legal pack analyses per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-success" />
                    AI-powered document review
                  </li>
                </ul>
                <Button
                  onClick={() => handleSelectPlan('starter')}
                  className="w-full"
                  variant="outline"
                >
                  Choose Starter
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3 relative">
                <div className="absolute -top-3 left-4">
                  <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h4 className="font-medium">Professional</h4>
                    <p className="text-sm text-muted-foreground">For busy solicitors and teams</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">£249</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-success" />
                    150 legal pack analyses per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-success" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-success" />
                    Advanced analytics
                  </li>
                </ul>
                <Button
                  onClick={() => handleSelectPlan('professional')}
                  className="w-full"
                >
                  Choose Professional
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {isUsageLimitReached ? "I'll wait for reset" : 'Maybe Later'}
          </Button>
          <Button variant="outline" onClick={handleViewPricing} className="w-full sm:w-auto">
            View All Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
