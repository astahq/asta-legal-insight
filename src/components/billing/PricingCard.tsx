import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <Card className={cn(
      'relative flex flex-col',
      isPopular && !isCurrentPlan && 'border-primary shadow-lg',
      isCurrentPlan && 'border-success'
    )}>
      {(isCurrentPlan || isPopular) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {isCurrentPlan ? (
            <Badge className="bg-success whitespace-nowrap">
              Current Plan
            </Badge>
          ) : isPopular ? (
            <Badge className="bg-primary whitespace-nowrap">
              Most Popular
            </Badge>
          ) : null}
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-center mb-6">
          <span className="text-4xl font-bold">{currency}{price}</span>
          {period && <span className="text-muted-foreground">/{period}</span>}
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className={cn(
                'w-5 h-5 mt-0.5 flex-shrink-0',
                feature.included ? 'text-success' : 'text-muted-foreground/30'
              )} />
              <span className={cn(
                'text-sm',
                !feature.included && 'text-muted-foreground line-through'
              )}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? 'default' : 'outline'}
          onClick={onSelect}
          disabled={disabled || loading || isCurrentPlan}
        >
          {loading ? 'Loading...' : isCurrentPlan ? 'Current Plan' : buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}
