  ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

  CREATE INDEX IF NOT EXISTS idx_reports_share_token ON public.reports(share_token) WHERE share_token IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_reports_is_public ON public.reports(is_public) WHERE is_public = true;

  CREATE OR REPLACE FUNCTION generate_share_token()
  RETURNS TEXT AS $$
  BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
  END;
  $$ LANGUAGE plpgsql;

  CREATE OR REPLACE FUNCTION toggle_report_sharing(p_report_id UUID, p_user_id UUID)
  RETURNS JSONB AS $$
  DECLARE
    v_current_state BOOLEAN;
    v_new_token TEXT;
  BEGIN
    SELECT is_public INTO v_current_state
    FROM reports
    WHERE id = p_report_id AND user_id = p_user_id;
    
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

  DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
  CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Public can view shared reports" ON public.reports;
  CREATE POLICY "Public can view shared reports"
  ON public.reports FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);
