-- The migration history diverged from the deployed database on the `plans` table.
--
-- 20260201000000_team_subscriptions_v2.sql defines plans with
-- trial_credits / reports_per_month / max_seats, but it was never applied to the
-- deployed project, which instead carries a single `usage_limit` column. All
-- application code (backend billing service, the billing RPCs) reads
-- plans.usage_limit, so a fresh `supabase db push` produced a plans table the app
-- could not read. This migration makes both shapes converge: every column exists,
-- and usage_limit -- the one the code uses -- is always populated.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER,
  ADD COLUMN IF NOT EXISTS trial_credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_per_month INTEGER DEFAULT -1,
  ADD COLUMN IF NOT EXISTS max_seats INTEGER NOT NULL DEFAULT 1;

-- Fill usage_limit on databases created from the migration chain, where the value
-- only exists in the legacy columns. -1 means unlimited and is kept as-is.
UPDATE public.plans
SET usage_limit = COALESCE(
  usage_limit,
  NULLIF(reports_per_month, 0),
  NULLIF(trial_credits, 0)
);

-- Mirror the value back into the legacy columns so any older function body or
-- query that still reads them agrees with usage_limit.
UPDATE public.plans
SET reports_per_month = usage_limit,
    trial_credits = CASE WHEN id = 'trial' THEN usage_limit ELSE 0 END
WHERE usage_limit IS NOT NULL;
