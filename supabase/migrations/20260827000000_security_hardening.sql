-- Security hardening for open-sourcing:
-- 1. toggle_report_sharing derives the user from auth.uid() instead of trusting a parameter
-- 2. Shared reports are fetched through a token-checking RPC instead of a blanket public SELECT policy
-- 3. Clients can no longer INSERT/UPDATE their own customers row (trial columns were writable from devtools)
-- 4. Client-callable billing RPCs enforce p_user_id = auth.uid() for non-service-role callers
-- 5. consume_usage accepts 'trialing' subscriptions and handles unlimited (-1) limits
-- 6. Refund RPCs so the backend can return a credit when processing fails (service-role only)
-- 7. reports added to the realtime publication (used by the watchlist)

-- ============================================================================
-- 1. toggle_report_sharing: auth.uid() based
-- ============================================================================

DROP FUNCTION IF EXISTS toggle_report_sharing(UUID, UUID);

CREATE OR REPLACE FUNCTION toggle_report_sharing(p_report_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_state BOOLEAN;
  v_new_token TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT is_public INTO v_current_state
  FROM reports
  WHERE id = p_report_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found or access denied';
  END IF;

  IF v_current_state THEN
    UPDATE reports
    SET is_public = false, share_token = NULL
    WHERE id = p_report_id;
    RETURN jsonb_build_object('is_public', false, 'share_token', NULL);
  ELSE
    v_new_token := generate_share_token();
    UPDATE reports
    SET is_public = true, share_token = v_new_token
    WHERE id = p_report_id;
    RETURN jsonb_build_object('is_public', true, 'share_token', v_new_token);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION toggle_report_sharing(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION toggle_report_sharing(UUID) TO authenticated;

-- ============================================================================
-- 2. Shared report access: token-checking RPC replaces the public SELECT policy
--    (the old policy exposed every shared report to anyone, token unchecked)
-- ============================================================================

DROP POLICY IF EXISTS "Public can view shared reports" ON public.reports;

CREATE OR REPLACE FUNCTION get_shared_report(p_report_id UUID, p_share_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_report reports%ROWTYPE;
BEGIN
  IF p_share_token IS NULL OR length(p_share_token) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_report
  FROM reports
  WHERE id = p_report_id
    AND is_public = true
    AND share_token = p_share_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_report) - 'user_id' - 'error';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_shared_report(UUID, TEXT) TO anon, authenticated;

-- ============================================================================
-- 3. customers: remove client write access (reads stay; writes go through
--    SECURITY DEFINER RPCs and the service-role backend)
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own customer record" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customer record" ON public.customers;

-- ============================================================================
-- 4. Client-callable billing RPCs: bind p_user_id to auth.uid() for
--    authenticated callers (service role calls have auth.uid() IS NULL)
-- ============================================================================

CREATE OR REPLACE FUNCTION assert_self_or_service(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION initialize_user_trial(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_trial_plan RECORD;
BEGIN
  PERFORM assert_self_or_service(p_user_id);

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

CREATE OR REPLACE FUNCTION consume_trial_credit(p_user_id UUID, p_report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_customer RECORD;
BEGIN
  PERFORM assert_self_or_service(p_user_id);

  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_customer IS NULL
     OR v_customer.trial_ends_at IS NULL
     OR v_customer.trial_ends_at < now()
     OR COALESCE(v_customer.trial_usage_count, 0) >= COALESCE(v_customer.trial_usage_limit, 3) THEN
    RETURN FALSE;
  END IF;

  UPDATE customers
  SET trial_usage_count = COALESCE(trial_usage_count, 0) + 1,
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE reports SET payment_status = 'paid' WHERE id = p_report_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. consume_usage: allow 'trialing' subscriptions, handle unlimited (-1)
-- ============================================================================

CREATE OR REPLACE FUNCTION consume_usage(p_user_id UUID, p_report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub RECORD;
  v_usage_limit INTEGER;
BEGIN
  PERFORM assert_self_or_service(p_user_id);

  SELECT s.*, p.reports_per_month
  INTO v_sub
  FROM subscriptions s
  LEFT JOIN plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE OF s;

  IF v_sub IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_sub.usage_limit IS NOT NULL THEN
    v_usage_limit := v_sub.usage_limit;
  ELSIF v_sub.reports_per_month IS NOT NULL AND v_sub.reports_per_month > 0 THEN
    v_usage_limit := v_sub.reports_per_month;
  ELSE
    UPDATE reports SET payment_status = 'paid' WHERE id = p_report_id;
    RETURN TRUE;
  END IF;

  IF v_usage_limit = -1 THEN
    UPDATE reports SET payment_status = 'paid' WHERE id = p_report_id;
    RETURN TRUE;
  END IF;

  IF COALESCE(v_sub.usage_count, 0) >= v_usage_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE subscriptions
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE id = v_sub.id;

  INSERT INTO usage_records (
    user_id,
    subscription_id,
    report_id,
    billing_period_start,
    billing_period_end
  ) VALUES (
    p_user_id,
    v_sub.id,
    p_report_id,
    v_sub.current_period_start,
    v_sub.current_period_end
  );

  UPDATE reports SET payment_status = 'paid' WHERE id = p_report_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Refund RPCs (service role only): return a consumed credit when
--    background processing fails after consumption
-- ============================================================================

CREATE OR REPLACE FUNCTION refund_trial_credit(p_user_id UUID, p_report_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET trial_usage_count = GREATEST(COALESCE(trial_usage_count, 0) - 1, 0),
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE reports SET payment_status = 'unpaid' WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refund_usage(p_user_id UUID, p_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  DELETE FROM usage_records
  WHERE id IN (
    SELECT id FROM usage_records
    WHERE user_id = p_user_id AND report_id = p_report_id
    ORDER BY created_at DESC
    LIMIT 1
  )
  RETURNING subscription_id INTO v_sub_id;

  IF v_sub_id IS NOT NULL THEN
    UPDATE subscriptions
    SET usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0),
        updated_at = now()
    WHERE id = v_sub_id;
  END IF;

  UPDATE reports SET payment_status = 'unpaid' WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION refund_trial_credit(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION refund_usage(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 7. reports in the realtime publication (watchlist live updates)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reports;
  END IF;
END $$;
