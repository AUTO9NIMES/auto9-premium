-- CRM V2 subscriptions
create table if not exists public.crm_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_name text not null,
  price numeric(10,2),
  frequency_months integer not null default 1 check (frequency_months between 1 and 24),
  next_due_on date not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_subscriptions_business_due_idx
  on public.crm_subscriptions (business_id, active, next_due_on);

create index if not exists crm_subscriptions_customer_idx
  on public.crm_subscriptions (business_id, customer_id);

alter table public.crm_subscriptions enable row level security;

drop policy if exists crm_subscriptions_service_role_all on public.crm_subscriptions;
create policy crm_subscriptions_service_role_all
  on public.crm_subscriptions
  for all
  to service_role
  using (true)
  with check (true);
