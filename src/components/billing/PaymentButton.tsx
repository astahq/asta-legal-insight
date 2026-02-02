import { useState } from 'react';
import { Loader2, CreditCard, Sparkles } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useBilling } from '@/contexts/BillingContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentButtonProps extends Omit<ButtonProps, 'onClick'> {
  mode: 'payment' | 'subscription';
  reportId?: string;
  children?: React.ReactNode;
}

export function PaymentButton({
  mode,
  reportId,
  children,
  className,
  variant = 'default',
  ...props
}: PaymentButtonProps) {
  const { createCheckout } = useBilling();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await createCheckout(mode, reportId);
    } catch (error) {
      toast({
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultContent = mode === 'subscription' ? (
    <>
      <Sparkles className="w-4 h-4 mr-2" />
      Subscribe Now
    </>
  ) : (
    <>
      <CreditCard className="w-4 h-4 mr-2" />
      Pay Now
    </>
  );

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={variant}
      className={cn(className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        children || defaultContent
      )}
    </Button>
  );
}
