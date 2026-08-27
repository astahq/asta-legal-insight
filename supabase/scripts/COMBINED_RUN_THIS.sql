-- ============================================================================
-- COMBINED BILLING MIGRATION - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- 
-- This migration sets up the complete billing system for ASTA Legal Insight:
-- 
-- Plans:
--   - Free Trial: 14 days, 3 analyses
--   - Starter: £99/month, 100 analyses per month
--   - Professional: £249/month, 300 analyses per month
--
-- Usage Model:
--   - All users have usage_count/usage_limit (no credit system)
--   - Trial users: limit tracked in customers table (usage_limit=3)
--   - Subscribed users: limit tracked in subscriptions table
--
-- Tables created:
--   - customers: Links users to Stripe, tracks trial usage
--   - subscriptions: Active subscriptions with usage tracking
--   - plans: Plan definitions and pricing
--   - usage_records: Audit log of usage
--   - payments: Payment/transaction history
--   - payment_logs: Webhook event logs for debugging
--
-- ============================================================================

-- ============================================================================
-- PART 1: CUSTOMERS TABLE
-- ============================================================================
-- Links Supabase users to Stripe customers and tracks trial status

create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  -- Trial tracking (same pattern as subscriptions: usage_count/usage_limit)
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_usage_count integer default 0,
  trial_usage_limit integer default 3,
  current_plan_id text default 'trial',
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.customers enable row level security;

-- RLS Policies for customers
drop policy if exists "Users can view their own customer record" on public.customers;
create policy "Users can view their own customer record"
  on public.customers for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own customer record" on public.customers;
create policy "Users can insert their own customer record"
  on public.customers for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own customer record" on public.customers;
create policy "Users can update their own customer record"
  on public.customers for update
  using (auth.uid() = id);

-- ============================================================================
-- PART 2: PLANS TABLE
-- ============================================================================
-- Defines available subscription plans

create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text,
  price_monthly integer not null, -- in pence (e.g., 9900 = £99.00)
  currency text default 'gbp',
  usage_limit integer not null, -- analyses per month (3 for trial, 100/300 for paid)
  trial_days integer default 0,
  features jsonb default '[]',
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- Insert plan data
insert into public.plans (id, name, description, price_monthly, usage_limit, trial_days, features, display_order) values
  ('trial', 'Free Trial', '14-day free trial with 3 analyses', 0, 3, 14, 
   '["AI-powered legal pack analysis", "Risk assessment scoring", "Document chat assistant"]'::jsonb, 0),
  ('starter', 'Starter', 'Perfect for growing practices', 9900, 100, 0, 
   '["100 legal pack analyses per month", "AI-powered document review", "Risk assessment scoring", "Document chat assistant", "Email support"]'::jsonb, 1),
  ('professional', 'Professional', 'For busy solicitors and teams', 24900, 300, 0, 
   '["300 legal pack analyses per month", "Everything in Starter", "Priority support", "Advanced analytics", "Bulk upload support"]'::jsonb, 2)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  usage_limit = excluded.usage_limit,
  trial_days = excluded.trial_days,
  features = excluded.features,
  display_order = excluded.display_order;

-- Enable RLS
alter table public.plans enable row level security;

-- Plans are publicly readable (no auth required to see pricing)
drop policy if exists "Plans are readable by everyone" on public.plans;
create policy "Plans are readable by everyone"
  on public.plans for select
  using (true);

-- ============================================================================
-- PART 3: SUBSCRIPTIONS TABLE
-- ============================================================================
-- Tracks active subscriptions with usage limits

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Stripe references
  stripe_subscription_id text unique not null,
  stripe_customer_id text not null,
  stripe_price_id text not null,
  -- Plan reference
  plan_id text references public.plans(id),
  -- Status
  status text not null check (status in (
    'active', 'canceled', 'incomplete', 'incomplete_expired',
    'past_due', 'trialing', 'unpaid', 'paused'
  )),
  -- Usage tracking (same for all: count towards limit)
  usage_count integer not null default 0,
  usage_limit integer not null, -- 100 for starter, 300 for professional
  -- Billing period
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  -- Cancellation
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_subscription_id on subscriptions(stripe_subscription_id);
create index if not exists idx_subscriptions_status on subscriptions(status);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Users can only view their own subscriptions
drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ============================================================================
-- PART 4: USAGE RECORDS TABLE (AUDIT LOG)
-- ============================================================================
-- Keeps history of usage for auditing purposes

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  report_id uuid references reports(id) on delete set null,
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  created_at timestamptz default now()
);

-- Index for period queries
create index if not exists idx_usage_records_user_period 
  on usage_records(user_id, billing_period_start, billing_period_end);

-- Enable RLS
alter table public.usage_records enable row level security;

-- Users can only view their own usage records
drop policy if exists "Users can view own usage records" on public.usage_records;
create policy "Users can view own usage records"
  on public.usage_records for select
  using (user_id = auth.uid());

-- ============================================================================
-- PART 5: PAYMENTS TABLE
-- ============================================================================
-- Payment/transaction history

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  amount integer not null, -- in pence
  currency text default 'gbp',
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  payment_type text not null check (payment_type in ('one_time', 'subscription')),
  report_id uuid references public.reports(id),
  metadata jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_payments_user_id on payments(user_id);
create index if not exists idx_payments_stripe_checkout_session_id on payments(stripe_checkout_session_id);

-- Enable RLS
alter table public.payments enable row level security;

-- Users can only view their own payments
drop policy if exists "Users can view their own payments" on public.payments;
create policy "Users can view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- ============================================================================
-- PART 6: PAYMENT LOGS TABLE
-- ============================================================================
-- Webhook event logs for debugging

create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  stripe_event_id text unique,
  payload jsonb,
  processed_at timestamptz default now(),
  error text
);

-- Indexes
create index if not exists idx_payment_logs_stripe_event_id on payment_logs(stripe_event_id);
create index if not exists idx_payment_logs_event_type on payment_logs(event_type);

-- ============================================================================
-- PART 7: UPDATE REPORTS TABLE
-- ============================================================================
-- Add payment tracking columns to reports

alter table public.reports 
  add column if not exists payment_status text default 'unpaid' 
  check (payment_status in ('unpaid', 'paid', 'refunded'));

alter table public.reports 
  add column if not exists payment_id uuid references public.payments(id);

create index if not exists idx_reports_payment_status on reports(payment_status);

-- ============================================================================
-- PART 8: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Check user access and usage limits
-- Returns subscription/trial status and usage info
create or replace function check_user_access(p_user_id uuid)
returns table (
  has_access boolean,
  is_trial boolean,
  plan_id text,
  usage_count integer,
  usage_limit integer,
  usage_remaining integer,
  period_ends_at timestamptz
) as $$
declare
  v_customer record;
  v_subscription record;
begin
  -- Get customer record
  select * into v_customer from customers where id = p_user_id;
  
  -- Check for active subscription first
  select s.* 
  into v_subscription 
  from subscriptions s
  where s.user_id = p_user_id and s.status in ('active', 'trialing')
  order by s.created_at desc limit 1;
  
  -- If user has active subscription
  if v_subscription is not null then
    return query select 
      v_subscription.usage_count < v_subscription.usage_limit, -- has_access
      false, -- is_trial
      v_subscription.plan_id,
      v_subscription.usage_count,
      v_subscription.usage_limit,
      greatest(0, v_subscription.usage_limit - v_subscription.usage_count),
      v_subscription.current_period_end;
    return;
  end if;
  
  -- If user is on trial (trial not expired)
  if v_customer is not null and v_customer.trial_ends_at > now() then
    return query select 
      v_customer.trial_usage_count < v_customer.trial_usage_limit, -- has_access
      true, -- is_trial
      'trial'::text,
      v_customer.trial_usage_count,
      v_customer.trial_usage_limit,
      greatest(0, v_customer.trial_usage_limit - v_customer.trial_usage_count),
      v_customer.trial_ends_at;
    return;
  end if;
  
  -- No access (trial expired or no customer record)
  return query select 
    false, -- has_access
    false, -- is_trial
    'expired'::text,
    0,
    0,
    0,
    null::timestamptz;
end;
$$ language plpgsql security definer;

-- Function: Consume trial usage
-- Called when trial user generates a report
create or replace function consume_trial_usage(p_user_id uuid, p_report_id uuid)
returns boolean as $$
declare
  v_customer record;
begin
  -- Lock and get customer
  select * into v_customer
  from customers 
  where id = p_user_id 
  for update;
  
  -- Check trial validity and usage
  if v_customer is null 
     or v_customer.trial_ends_at <= now() 
     or v_customer.trial_usage_count >= v_customer.trial_usage_limit then
    return false;
  end if;
  
  -- Increment usage
  update customers 
  set trial_usage_count = trial_usage_count + 1,
      updated_at = now()
  where id = p_user_id;
  
  -- Mark report as paid
  update reports set payment_status = 'paid' where id = p_report_id;
  
  return true;
end;
$$ language plpgsql security definer;

-- Function: Consume subscription usage
-- Called when subscribed user generates a report
create or replace function consume_usage(p_user_id uuid, p_report_id uuid)
returns boolean as $$
declare
  v_sub record;
begin
  -- Lock and get subscription
  select * into v_sub
  from subscriptions
  where user_id = p_user_id and status = 'active'
  for update;
  
  -- No active subscription
  if v_sub is null then
    return false;
  end if;
  
  -- Check if at limit
  if v_sub.usage_count >= v_sub.usage_limit then
    return false;
  end if;
  
  -- Increment usage count
  update subscriptions 
  set usage_count = usage_count + 1,
      updated_at = now()
  where id = v_sub.id;
  
  -- Create audit record
  insert into usage_records (
    user_id, 
    subscription_id, 
    report_id, 
    billing_period_start, 
    billing_period_end
  ) values (
    p_user_id,
    v_sub.id,
    p_report_id,
    v_sub.current_period_start,
    v_sub.current_period_end
  );
  
  -- Mark report as paid
  update reports set payment_status = 'paid' where id = p_report_id;
  
  return true;
end;
$$ language plpgsql security definer;

-- Function: Reset subscription usage
-- Called by webhook when billing period renews (invoice.payment_succeeded)
create or replace function reset_subscription_usage(
  p_stripe_subscription_id text, 
  p_period_start timestamptz, 
  p_period_end timestamptz
)
returns void as $$
begin
  update subscriptions
  set usage_count = 0,
      current_period_start = p_period_start,
      current_period_end = p_period_end,
      updated_at = now()
  where stripe_subscription_id = p_stripe_subscription_id;
end;
$$ language plpgsql security definer;

-- Function: Initialize user trial
-- Called when new user signs up
create or replace function initialize_user_trial(p_user_id uuid)
returns void as $$
declare
  v_trial_plan record;
begin
  -- Get trial plan configuration
  select * into v_trial_plan from plans where id = 'trial';
  
  -- Create customer record with trial
  insert into customers (
    id, 
    trial_started_at, 
    trial_ends_at, 
    trial_usage_count,
    trial_usage_limit,
    current_plan_id
  )
  values (
    p_user_id,
    now(),
    now() + (coalesce(v_trial_plan.trial_days, 14) || ' days')::interval,
    0,
    coalesce(v_trial_plan.usage_limit, 3),
    'trial'
  )
  on conflict (id) do nothing;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- DONE! 
-- ============================================================================
-- Your billing system is now set up with:
--   - Free Trial: 14 days, 3 analyses (usage_count/usage_limit pattern)
--   - Starter Plan: £99/month, 100 analyses
--   - Professional Plan: £249/month, 300 analyses
-- 
-- Usage pattern is consistent everywhere:
--   - Trial: customers.trial_usage_count / customers.trial_usage_limit
--   - Subscription: subscriptions.usage_count / subscriptions.usage_limit
--
-- Next steps:
--   1. Create Stripe products and prices matching these plans
--   2. Set up webhook endpoint in Stripe Dashboard
--   3. Deploy edge functions for checkout, webhook, portal, billing-status
--   4. Add environment variables for Stripe keys and price IDs
-- ============================================================================
