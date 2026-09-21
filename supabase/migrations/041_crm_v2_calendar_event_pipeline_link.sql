-- Link standalone calendar events to commercial pipeline and store agreed price
alter table public.crm_calendar_events
  add column if not exists price numeric(10,2),
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

alter table public.crm_calendar_events
  drop constraint if exists crm_calendar_events_price_nonnegative;

alter table public.crm_calendar_events
  add constraint crm_calendar_events_price_nonnegative
  check (price is null or price >= 0);

create index if not exists crm_calendar_events_lead_idx
  on public.crm_calendar_events (business_id, lead_id);
