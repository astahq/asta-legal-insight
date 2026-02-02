-- Automatically initialize trial for new users on signup
-- This updates the existing handle_new_user trigger to also create a customer record with trial

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_trial_plan RECORD;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  
  SELECT * INTO v_trial_plan FROM plans WHERE id = 'trial';
  
  INSERT INTO public.customers (
    id,
    trial_started_at,
    trial_ends_at,
    trial_usage_count,
    trial_usage_limit,
    current_plan_id
  )
  VALUES (
    new.id,
    now(),
    now() + (COALESCE(v_trial_plan.trial_days, 14) || ' days')::interval,
    0,
    COALESCE(v_trial_plan.usage_limit, 3),
    'trial'
  )
  ON CONFLICT (id) DO UPDATE SET
    trial_started_at = COALESCE(customers.trial_started_at, now()),
    trial_ends_at = COALESCE(customers.trial_ends_at, now() + (COALESCE(v_trial_plan.trial_days, 14) || ' days')::interval),
    trial_usage_count = COALESCE(customers.trial_usage_count, 0),
    trial_usage_limit = COALESCE(customers.trial_usage_limit, COALESCE(v_trial_plan.usage_limit, 3)),
    current_plan_id = COALESCE(customers.current_plan_id, 'trial'),
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Also update initialize_user_trial to use DO UPDATE instead of DO NOTHING
-- This allows re-initializing trial for users who somehow don't have trial set up
CREATE OR REPLACE FUNCTION initialize_user_trial(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_trial_plan RECORD;
BEGIN
  SELECT * INTO v_trial_plan FROM plans WHERE id = 'trial';
  
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
    now() + (COALESCE(v_trial_plan.trial_days, 14) || ' days')::interval,
    0,
    COALESCE(v_trial_plan.usage_limit, 3),
    'trial'
  )
  ON CONFLICT (id) DO UPDATE SET
    trial_started_at = COALESCE(customers.trial_started_at, now()),
    trial_ends_at = COALESCE(customers.trial_ends_at, now() + (COALESCE(v_trial_plan.trial_days, 14) || ' days')::interval),
    trial_usage_count = COALESCE(customers.trial_usage_count, 0),
    trial_usage_limit = COALESCE(customers.trial_usage_limit, COALESCE(v_trial_plan.usage_limit, 3)),
    current_plan_id = COALESCE(customers.current_plan_id, 'trial'),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
