-- Standalone CRM V2 calendar events
create table if not exists public.crm_calendar_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  title text not null,
  service_name text,
  event_date date not null,
  event_time time not null,
  notes text,
  status text not null default 'CONFIRMED'
    check (status in ('CONFIRMED','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_calendar_events_business_date_idx
  on public.crm_calendar_events (business_id, event_date, event_time);

alter table public.crm_calendar_events enable row level security;

drop policy if exists crm_calendar_events_service_role_all
  on public.crm_calendar_events;

create policy crm_calendar_events_service_role_all
  on public.crm_calendar_events
  for all
  to service_role
  using (true)
  with check (true);
