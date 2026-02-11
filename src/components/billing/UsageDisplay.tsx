import { FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBilling } from '@/contexts/BillingContext';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

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
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer ${
              isAtLimit ? 'bg-destructive/10 border-destructive/30' :
              isNearLimit ? 'bg-warning/10 border-warning/30' :
              'bg-muted/50 border-border'
            } ${className}`}>
              <FileText className={`w-4 h-4 ${
                isAtLimit ? 'text-destructive' :
                isNearLimit ? 'text-warning' :
                'text-muted-foreground'
              }`} />
              <span className={`text-sm font-medium ${
                isAtLimit ? 'text-destructive' :
                isNearLimit ? 'text-warning' : ''
              }`}>
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

  return (
    <Card className={`${
      isAtLimit ? 'border-destructive bg-destructive/5' :
      isNearLimit ? 'border-warning bg-warning/5' : ''
    } ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              {isAtLimit && <AlertTriangle className="w-4 h-4 text-destructive" />}
              Monthly Usage
            </h3>
            <p className="text-sm text-muted-foreground">
              {access?.planId === 'starter' ? 'Starter Plan' : 
               access?.planId === 'professional' ? 'Professional Plan' : 
               access?.planId === 'trial' ? 'Trial' : 'Current Plan'}
            </p>
          </div>
          <Badge variant={isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}>
            {usage.remaining} remaining
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{usage.used} used</span>
              <span>{usage.limit} limit</span>
            </div>
            <Progress 
              value={usage.percentUsed} 
              className={`h-3 ${
                isAtLimit ? '[&>div]:bg-destructive' :
                isNearLimit ? '[&>div]:bg-warning' : ''
              }`}
            />
          </div>

          {resetDate && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Resets on {format(resetDate, 'MMM d, yyyy')}</span>
              <span>{resetText}</span>
            </div>
          )}

          {isAtLimit && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <p className="font-medium">You've reached your monthly limit</p>
              <p>Upgrade your plan or wait for the reset to continue analysing legal packs.</p>
            </div>
          )}

          {isNearLimit && !isAtLimit && (
            <div className="p-3 rounded-lg bg-warning/10 text-warning-foreground text-sm">
              <p className="font-medium">Approaching your monthly limit</p>
              <p>You have {usage.remaining} analyses remaining this month.</p>
            </div>
          )}

          {showUpgradeButton && access?.planId === 'starter' && (
            <Button 
              onClick={() => navigate('/pricing')} 
              variant={isAtLimit ? 'default' : 'outline'}
              className="w-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade to Professional (150/month)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
