import { FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBilling } from '@/contexts/BillingContext';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface UsageDisplayProps {
  variant?: 'compact' | 'full';
  showUpgradeButton?: boolean;
  className?: string;
}

export function UsageDisplay({ variant = 'compact', showUpgradeButton = true, className }: UsageDisplayProps) {
  const navigate = useNavigate();
  const { usage, subscription, hasUsageLimits, isNearLimit, isAtLimit, access } = useBilling();

  if (!hasUsageLimits || !usage) {
    return null;
  }

  const resetDate = usage.periodEndsAt ? new Date(usage.periodEndsAt) : null;
  const resetText = resetDate ? formatDistanceToNow(resetDate, { addSuffix: true }) : '';

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer',
              isAtLimit ? 'bg-destructive/10 border-destructive/30' :
              isNearLimit ? 'bg-warning/10 border-warning/30' :
              'bg-muted/50 border-border',
              className
            )}>
              <FileText className={cn(
                'w-4 h-4',
                isAtLimit ? 'text-destructive' :
                isNearLimit ? 'text-warning' :
                'text-muted-foreground'
              )} />
              <span className={cn(
                'text-sm font-medium',
                isAtLimit ? 'text-destructive' :
                isNearLimit ? 'text-warning' : ''
              )}>
                {usage.remaining}/{usage.limit}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 p-1">
              <p className="font-medium">
                {usage.remaining} reports remaining this month
              </p>
              <Progress value={usage.percentUsed} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usage.used} of {usage.limit} used {resetText && `• Resets ${resetText}`}
              </p>
              {access?.planId === 'starter' && (
                <p className="text-xs text-primary">
                  Upgrade to Professional for 150 reports/month
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const remainingPercent = 100 - usage.percentUsed;
  const strokeDashoffset = circumference - (remainingPercent / 100) * circumference;

  return (
    <Card className={cn(
      isAtLimit ? 'border-destructive/30' :
      isNearLimit ? 'border-warning/30' : '',
      className
    )}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
              <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="5" className="stroke-muted/50" />
              <circle
                cx="28" cy="28" r={radius} fill="none" strokeWidth="5" strokeLinecap="round"
                className={cn(
                  'transition-all duration-700 ease-out',
                  isAtLimit ? 'stroke-destructive' : isNearLimit ? 'stroke-warning' : 'stroke-primary'
                )}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                'text-base font-bold leading-none',
                isAtLimit ? 'text-destructive' : isNearLimit ? 'text-warning' : 'text-primary'
              )}>
                {usage.remaining}
              </span>
              <span className="text-[7px] text-muted-foreground mt-0.5">left</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {isAtLimit && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                Monthly Usage
              </h3>
              <Badge variant={isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'} className="text-xs">
                {access?.planId === 'starter' ? 'Starter' :
                 access?.planId === 'professional' ? 'Professional' :
                 access?.planId === 'trial' ? 'Trial' : 'Plan'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {usage.used} of {usage.limit} reports used
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Progress
              value={usage.percentUsed}
              className={cn('h-2',
                isAtLimit ? '[&>div]:bg-destructive' :
                isNearLimit ? '[&>div]:bg-warning' : ''
              )}
            />
            {resetDate && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Resets {format(resetDate, 'MMM d, yyyy')} ({resetText})
              </p>
            )}
          </div>

          {isAtLimit && (
            <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
              <p className="font-medium">Monthly limit reached</p>
              <p className="mt-0.5">Upgrade or wait for reset to continue.</p>
            </div>
          )}

          {isNearLimit && !isAtLimit && (
            <div className="p-2.5 rounded-lg bg-warning/10 text-warning-foreground text-xs">
              <p className="font-medium">Approaching limit — {usage.remaining} remaining</p>
            </div>
          )}

          {showUpgradeButton && access?.planId === 'starter' && (
            <Button
              onClick={() => navigate('/pricing')}
              variant={isAtLimit ? 'primary' : 'outline'}
              size="sm"
              className="w-full"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Upgrade to Professional (150/mo)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
