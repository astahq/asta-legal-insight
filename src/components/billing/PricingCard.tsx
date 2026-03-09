import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  title: string;
  description: string;
  price: number;
  currency?: string;
  period?: string;
  features: PricingFeature[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  buttonText: string;
  onSelect: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PricingCard({
  title,
  description,
  price,
  currency = '£',
  period,
  features,
  isPopular = false,
  isCurrentPlan = false,
  buttonText,
  onSelect,
  loading = false,
  disabled = false
}: PricingCardProps) {
  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
      isPopular && !isCurrentPlan && 'border-primary/40 shadow-md shadow-primary/5',
      isCurrentPlan && 'border-success/40',
      !isPopular && !isCurrentPlan && 'border-border/50'
    )}>
      {(isCurrentPlan || isPopular) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {isCurrentPlan ? (
            <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-success text-white rounded-full shadow-sm">
              Current Plan
            </span>
          ) : isPopular ? (
            <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full shadow-sm shadow-primary/20">
              Most Popular
            </span>
          ) : null}
        </div>
      )}

      <div className="text-center mb-5 pt-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold">{currency}{price}</span>
          {period && <span className="text-sm text-muted-foreground">/{period}</span>}
        </div>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <div className={cn(
              'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
              feature.included ? 'bg-success/10' : 'bg-muted'
            )}>
              <Check className={cn(
                'w-2.5 h-2.5',
                feature.included ? 'text-success' : 'text-muted-foreground/30'
              )} />
            </div>
            <span className={cn(
              'text-sm',
              !feature.included && 'text-muted-foreground line-through'
            )}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant={isPopular ? 'primary' : 'outline'}
        onClick={onSelect}
        disabled={disabled || loading || isCurrentPlan}
      >
        {loading ? 'Loading...' : isCurrentPlan ? 'Current Plan' : buttonText}
      </Button>
    </div>
  );
}
