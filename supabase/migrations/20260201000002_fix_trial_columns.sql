-- Fix trial column naming inconsistency
-- The frontend/backend expect trial_usage_count and trial_usage_limit
-- But some migrations created trial_credits_total and trial_credits_used

-- Add the expected columns if they don't exist
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS trial_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_usage_limit INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_plan_id TEXT;

-- Migrate data from old columns to new columns if they exist
DO $$
BEGIN
  -- Check if old columns exist and migrate data
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'customers' AND column_name = 'trial_credits_used') THEN
    UPDATE public.customers 
    SET trial_usage_count = COALESCE(trial_credits_used, 0)
    WHERE trial_usage_count = 0 AND trial_credits_used > 0;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'customers' AND column_name = 'trial_credits_total') THEN
    UPDATE public.customers 
    SET trial_usage_limit = COALESCE(trial_credits_total, 3)
    WHERE trial_usage_limit = 3 AND trial_credits_total IS NOT NULL AND trial_credits_total != 3;
  END IF;
END $$;

-- Update initialize_user_trial function to use correct column names
CREATE OR REPLACE FUNCTION initialize_user_trial(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_trial_plan RECORD;
BEGIN
  -- Get trial plan settings
  SELECT * INTO v_trial_plan FROM plans WHERE id = 'trial';
  
  -- Use default values if trial plan doesn't exist
  IF v_trial_plan IS NULL THEN
    v_trial_plan := ROW(14, 3); -- 14 days, 3 credits
  END IF;
  
  -- Insert or update customer with trial info
  INSERT INTO customers (
    id, 
    trial_started_at, 
    trial_ends_at, 
    trial_usage_count,
    trial_usage_limit,
    current_plan_id
  )
  VALUES (
    p_user_id,
    now(),
    now() + COALESCE(v_trial_plan.trial_days, 14) * INTERVAL '1 day',
    0,
    COALESCE(v_trial_plan.trial_credits, 3),
    'trial'
  )
  ON CONFLICT (id) DO UPDATE SET
    trial_started_at = COALESCE(customers.trial_started_at, now()),
    trial_ends_at = COALESCE(customers.trial_ends_at, now() + COALESCE(v_trial_plan.trial_days, 14) * INTERVAL '1 day'),
    trial_usage_count = COALESCE(customers.trial_usage_count, 0),
    trial_usage_limit = COALESCE(customers.trial_usage_limit, COALESCE(v_trial_plan.trial_credits, 3)),
    current_plan_id = COALESCE(customers.current_plan_id, 'trial'),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update consume_trial_credit function to use correct column names  
-- This is an alias for consume_trial_usage for compatibility
CREATE OR REPLACE FUNCTION consume_trial_credit(p_user_id UUID, p_report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_customer RECORD;
BEGIN
  -- Lock and get customer
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if trial is valid and has remaining credits
  IF v_customer IS NULL 
     OR v_customer.trial_ends_at IS NULL 
     OR v_customer.trial_ends_at < now()
     OR COALESCE(v_customer.trial_usage_count, 0) >= COALESCE(v_customer.trial_usage_limit, 3) THEN
    RETURN FALSE;
  END IF;
  
  -- Increment usage count
  UPDATE customers 
  SET trial_usage_count = COALESCE(trial_usage_count, 0) + 1,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Mark report as paid
  UPDATE reports SET payment_status = 'paid' WHERE id = p_report_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: check_user_access function is NOT updated here because COMBINED_RUN_THIS.sql
-- already has the correct version. If you need to update it, first run:
-- DROP FUNCTION IF EXISTS check_user_access(UUID);
-- Then recreate with the new signature.
