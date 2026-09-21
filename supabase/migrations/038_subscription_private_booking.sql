-- Subscription private booking links and booking requests
alter table public.crm_subscriptions
  add column if not exists booking_token uuid not null default gen_random_uuid();

create unique index if not exists crm_subscriptions_booking_token_idx
  on public.crm_subscriptions (booking_token);

create table if not exists public.crm_subscription_booking_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_id uuid not null references public.crm_subscriptions(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  requested_date date not null,
  requested_time time not null,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED','CONFIRMED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_subscription_booking_requests_business_idx
  on public.crm_subscription_booking_requests (business_id, status, requested_date);

create index if not exists crm_subscription_booking_requests_subscription_idx
  on public.crm_subscription_booking_requests (subscription_id, created_at desc);

alter table public.crm_subscription_booking_requests enable row level security;

drop policy if exists crm_subscription_booking_requests_service_role_all
  on public.crm_subscription_booking_requests;

create policy crm_subscription_booking_requests_service_role_all
  on public.crm_subscription_booking_requests
  for all
  to service_role
  using (true)
  with check (true);
