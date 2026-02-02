import { Calendar, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBilling } from '@/contexts/BillingContext';
import { format } from 'date-fns';

const statusConfig = {
  active: {
    label: 'Active',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-success'
  },
  trialing: {
    label: 'Trial',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-blue-500'
  },
  past_due: {
    label: 'Past Due',
    variant: 'destructive' as const,
    icon: AlertTriangle,
    color: 'text-destructive'
  },
  canceled: {
    label: 'Canceled',
    variant: 'outline' as const,
    icon: XCircle,
    color: 'text-muted-foreground'
  },
  incomplete: {
    label: 'Incomplete',
    variant: 'outline' as const,
    icon: AlertTriangle,
    color: 'text-warning'
  },
  incomplete_expired: {
    label: 'Expired',
    variant: 'outline' as const,
    icon: XCircle,
    color: 'text-muted-foreground'
  },
  unpaid: {
    label: 'Unpaid',
    variant: 'destructive' as const,
    icon: AlertTriangle,
    color: 'text-destructive'
  },
  paused: {
    label: 'Paused',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-muted-foreground'
  }
};

interface SubscriptionStatusProps {
  showManageButton?: boolean;
}

export function SubscriptionStatus({ showManageButton = true }: SubscriptionStatusProps) {
  const { subscription, usage, loading, openCustomerPortal, hasActiveSubscription, isCanceled, hasUsageLimits, isNearLimit, isAtLimit, access } = useBilling();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">No Active Subscription</CardTitle>
          <CardDescription>
            Subscribe to get monthly analyses and unlock all features.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const displayStatus = isCanceled ? 'canceled' : subscription.status;
  const config = statusConfig[displayStatus] || statusConfig.canceled;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
            Subscription Status
          </CardTitle>
          <Badge variant={isCanceled ? 'outline' : config.variant}>
            {isCanceled ? 'Canceling' : config.label}
          </Badge>
        </div>
        {isCanceled && subscription.currentPeriodEnd && (
          <CardDescription className="text-warning">
            Your subscription will end on {format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {hasUsageLimits && usage ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Usage</span>
                <span className={`font-medium ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-warning' : ''}`}>
                  {usage.used} / {usage.limit}
                </span>
              </div>
              <Progress 
                value={usage.percentUsed} 
                className={`h-2 ${
                  isAtLimit ? '[&>div]:bg-destructive' :
                  isNearLimit ? '[&>div]:bg-warning' : ''
                }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold">{usage.remaining}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-medium capitalize">{access?.planId}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-medium capitalize">{access?.planId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reports</p>
              <p className="text-lg font-medium">Unlimited</p>
            </div>
          </div>
        )}

        {subscription.currentPeriodEnd && ['active', 'trialing'].includes(subscription.status) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {isCanceled 
                ? `Access ends on ${format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}`
                : hasUsageLimits 
                  ? `Usage resets on ${format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}`
                  : `Renews on ${format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}`
              }
            </span>
          </div>
        )}

        {subscription.status === 'past_due' && (
          <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            Your payment is past due. Please update your payment method to continue using the service.
          </div>
        )}

        {isCanceled && (
          <div className="p-3 bg-warning/10 rounded-lg text-sm text-warning-foreground">
            Your subscription is scheduled to cancel. You can reactivate anytime before the end date.
          </div>
        )}

        {showManageButton && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openCustomerPortal()}
          >
            {isCanceled ? 'Reactivate Subscription' : 'Manage Subscription'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
