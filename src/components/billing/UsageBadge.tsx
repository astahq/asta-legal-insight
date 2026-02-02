import { FileText, Infinity, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBilling } from '@/contexts/BillingContext';

interface UsageBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export function UsageBadge({ className, showTooltip = true }: UsageBadgeProps) {
  const { usage, access, hasUsageLimits, isNearLimit, isAtLimit, isPaidPlan, isTrialActive } = useBilling();

  if (isPaidPlan && !hasUsageLimits) {
    const content = (
      <Badge variant="default" className={`gap-1 bg-success hover:bg-success/90 ${className}`}>
        <Infinity className="w-3 h-3" />
        Unlimited
      </Badge>
    );

    if (!showTooltip) return content;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>Unlimited property analysis with your {access?.planId === 'professional' ? 'Professional' : 'Starter'} plan</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!hasUsageLimits || !usage) {
    if (!access?.hasAccess) {
      return (
        <Badge variant="outline" className={`gap-1 ${className}`}>
          <Crown className="w-3 h-3" />
          Upgrade
        </Badge>
      );
    }
    return null;
  }

  const content = (
    <Badge 
      variant={isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}
      className={`gap-1 ${className}`}
    >
      <FileText className="w-3 h-3" />
      {usage.remaining}/{usage.limit}
    </Badge>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{usage.remaining} analyses remaining</p>
            <p className="text-xs text-muted-foreground">
              {usage.used} of {usage.limit} used this month
            </p>
            {isTrialActive && (
              <p className="text-xs text-muted-foreground">Trial reports</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
