ALTER TABLE public.customers
ADD CONSTRAINT check_trial_dates_valid
CHECK (
  (trial_started_at IS NULL AND trial_ends_at IS NULL) OR
  (trial_started_at IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_started_at < trial_ends_at)
);

ALTER TABLE public.customers
ADD CONSTRAINT check_trial_usage_valid
CHECK (
  trial_usage_limit IS NULL OR trial_usage_limit > 0
);

ALTER TABLE public.customers
ADD CONSTRAINT check_trial_usage_count_valid
CHECK (
  trial_usage_count IS NULL OR trial_usage_count >= 0
);

CREATE OR REPLACE FUNCTION validate_trial_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_started_at IS NOT NULL AND NEW.trial_ends_at IS NOT NULL THEN
    IF NEW.trial_started_at >= NEW.trial_ends_at THEN
      RAISE EXCEPTION 'trial_started_at must be before trial_ends_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_trial_dates_trigger ON public.customers;
CREATE TRIGGER validate_trial_dates_trigger
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION validate_trial_dates();
