import { Clock, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/contexts/BillingContext';
import { cn } from '@/lib/utils';

interface TrialStatusProps {
  variant?: 'banner' | 'compact' | 'card';
  className?: string;
}

export function TrialStatus({ variant = 'banner', className }: TrialStatusProps) {
  const { trial, isTrialActive, isTrialExpired, isPaidPlan, shouldShowUpgradePrompt } = useBilling();

  if (isPaidPlan) {
    return null;
  }

  if (!isTrialActive && !isTrialExpired) {
    return null;
  }

  const usagePercentage = trial ? (trial.usageCount / trial.usageLimit) * 100 : 100;
  const isLowUsage = trial ? trial.usageRemaining <= 1 : true;
  const isNoUsage = trial ? trial.usageRemaining === 0 : true;

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {isTrialExpired ? (
          <span className="text-sm text-destructive font-medium">Trial expired</span>
        ) : (
          <>
            <Zap className={cn(
              'w-4 h-4',
              isNoUsage ? 'text-destructive' : isLowUsage ? 'text-warning' : 'text-success'
            )} />
            <span className="text-sm font-medium">
              {trial?.usageRemaining} / {trial?.usageLimit}
            </span>
            {trial?.daysRemaining !== undefined && (
              <span className="text-xs text-muted-foreground">
                ({trial.daysRemaining}d left)
              </span>
            )}
          </>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'bg-card border rounded-lg p-4 space-y-3',
        isNoUsage || isTrialExpired ? 'border-destructive/50' : 'border-border',
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isNoUsage || isTrialExpired ? 'bg-destructive/10' : 'bg-primary/10'
            )}>
              {isTrialExpired ? (
                <Clock className="w-4 h-4 text-destructive" />
              ) : (
                <Zap className={cn(
                  'w-4 h-4',
                  isNoUsage ? 'text-destructive' : 'text-primary'
                )} />
              )}
            </div>
            <div>
              <p className="font-medium">
                {isTrialExpired ? 'Trial Expired' : 'Free Trial'}
              </p>
              {!isTrialExpired && trial && (
                <p className="text-xs text-muted-foreground">
                  {trial.daysRemaining} days remaining
                </p>
              )}
            </div>
          </div>
          {shouldShowUpgradePrompt && (
            <Button asChild size="sm">
              <Link to="/pricing">
                Upgrade
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>

        {!isTrialExpired && trial && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reports used</span>
              <span className={cn(
                'font-medium',
                isNoUsage ? 'text-destructive' : isLowUsage ? 'text-warning' : ''
              )}>
                {trial.usageCount} / {trial.usageLimit}
              </span>
            </div>
            <Progress
              value={usagePercentage}
              className={cn(
                'h-2',
                isNoUsage ? '[&>div]:bg-destructive' : isLowUsage ? '[&>div]:bg-warning' : ''
              )}
            />
          </div>
        )}

        {(isNoUsage || isTrialExpired) && (
          <p className="text-sm text-muted-foreground">
            {isTrialExpired
              ? 'Your trial has ended. Upgrade to continue analyzing properties.'
              : 'You have used all your trial reports. Upgrade to continue.'}
          </p>
        )}
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 px-4 py-3 rounded-lg',
      isNoUsage || isTrialExpired
        ? 'bg-destructive/10 border border-destructive/20'
        : isLowUsage
        ? 'bg-warning/10 border border-warning/20'
        : 'bg-muted/50 border border-border',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          isNoUsage || isTrialExpired
            ? 'bg-destructive/20'
            : isLowUsage
            ? 'bg-warning/20'
            : 'bg-primary/20'
        )}>
          {isTrialExpired ? (
            <Clock className="w-5 h-5 text-destructive" />
          ) : (
            <Zap className={cn(
              'w-5 h-5',
              isNoUsage ? 'text-destructive' : isLowUsage ? 'text-warning' : 'text-primary'
            )} />
          )}
        </div>
        <div>
          <p className="font-medium">
            {isTrialExpired
              ? 'Your trial has expired'
              : isNoUsage
              ? 'No trial reports remaining'
              : `${trial?.usageRemaining} of ${trial?.usageLimit} trial reports left`}
          </p>
          <p className="text-sm text-muted-foreground">
            {isTrialExpired || isNoUsage
              ? 'Upgrade now to continue analyzing properties'
              : `${trial?.daysRemaining} days remaining in your trial`}
          </p>
        </div>
      </div>

      <Button asChild variant={isNoUsage || isTrialExpired ? 'default' : 'outline'}>
        <Link to="/pricing">
          {isNoUsage || isTrialExpired ? 'Upgrade Now' : 'View Plans'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    </div>
  );
}
