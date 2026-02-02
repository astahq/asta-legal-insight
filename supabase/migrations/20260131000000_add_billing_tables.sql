-- Billing tables for Stripe payment integration

-- Customer billing information (links Supabase users to Stripe customers)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription tracking
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'active', 'canceled', 'incomplete', 'incomplete_expired',
    'past_due', 'trialing', 'unpaid', 'paused'
  )),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Report credits (for subscription limits and one-time purchases)
CREATE TABLE public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_used_this_period INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Payment/transaction history
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'gbp',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('one_time', 'subscription')),
  report_id UUID REFERENCES public.reports(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment logs for debugging and audit trail
CREATE TABLE public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT now(),
  error TEXT
);

-- Add payment_status to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' 
CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id);

-- Indexes for better query performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_checkout_session_id ON payments(stripe_checkout_session_id);
CREATE INDEX idx_payment_logs_stripe_event_id ON payment_logs(stripe_event_id);
CREATE INDEX idx_payment_logs_event_type ON payment_logs(event_type);
CREATE INDEX idx_reports_payment_status ON reports(payment_status);

-- RLS Policies for customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer record"
ON public.customers FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own customer record"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own customer record"
ON public.customers FOR UPDATE
USING (auth.uid() = id);

-- RLS Policies for subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for credits table
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
ON public.credits FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- Function for atomic credit consumption
CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID, p_report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits_remaining INTEGER;
BEGIN
  SELECT credits_remaining INTO v_credits_remaining
  FROM credits WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_credits_remaining IS NULL OR v_credits_remaining <= 0 THEN
    RETURN FALSE;
  END IF;
  
  UPDATE credits 
  SET credits_remaining = credits_remaining - 1,
      credits_used_this_period = credits_used_this_period + 1,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  UPDATE reports SET payment_status = 'paid' WHERE id = p_report_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset credits on subscription renewal
CREATE OR REPLACE FUNCTION reset_subscription_credits(p_user_id UUID, p_period_start TIMESTAMPTZ, p_period_end TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
  UPDATE credits 
  SET credits_remaining = 5,
      credits_used_this_period = 0,
      period_start = p_period_start,
      period_end = p_period_end,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize credits for new subscription
CREATE OR REPLACE FUNCTION initialize_subscription_credits(p_user_id UUID, p_period_start TIMESTAMPTZ, p_period_end TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
  INSERT INTO credits (user_id, credits_remaining, credits_used_this_period, period_start, period_end)
  VALUES (p_user_id, 5, 0, p_period_start, p_period_end)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    credits_remaining = 5,
    credits_used_this_period = 0,
    period_start = p_period_start,
    period_end = p_period_end,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
