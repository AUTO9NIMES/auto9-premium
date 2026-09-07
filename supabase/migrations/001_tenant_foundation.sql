create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_businesses_slug on public.businesses (slug);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  full_name text not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_customers_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade
);

create unique index if not exists ux_customers_business_id on public.customers (business_id, id);
create index if not exists idx_customers_business_id on public.customers (business_id);
create index if not exists idx_customers_business_email on public.customers (business_id, lower(email));
create index if not exists idx_customers_business_phone on public.customers (business_id, lower(phone));

create table if not exists public.customer_identifiers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  identifier_type text not null check (identifier_type in ('email', 'phone', 'company', 'external_ref')),
  identifier_value text not null,
  normalized_value text not null,
  source text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint fk_customer_identifiers_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_customer_identifiers_customer
    foreign key (business_id, customer_id)
    references public.customers (business_id, id)
    on delete cascade
    on update cascade,
  constraint chk_customer_identifier_value_not_empty
    check (length(trim(identifier_value)) > 0),
  constraint chk_customer_identifier_normalized_value_not_empty
    check (length(trim(normalized_value)) > 0)
);

create index if not exists idx_customer_identifiers_business_type on public.customer_identifiers (business_id, identifier_type, normalized_value);
create index if not exists idx_customer_identifiers_customer_id on public.customer_identifiers (customer_id);
create unique index if not exists ux_customer_identifiers_business_type_value
  on public.customer_identifiers (business_id, identifier_type, normalized_value);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  brand text,
  model text,
  variant text,
  year int,
  color text,
  plate text,
  mileage_km integer,
  vehicle_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_vehicles_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_vehicles_customer
    foreign key (business_id, customer_id)
    references public.customers (business_id, id)
    on delete cascade
    on update cascade,
  constraint chk_vehicles_year_range
    check (year is null or (year between 1900 and 2100))
);

create unique index if not exists ux_vehicles_business_id on public.vehicles (business_id, id);
create unique index if not exists ux_vehicles_business_customer_id on public.vehicles (business_id, customer_id, id);
create index if not exists idx_vehicles_business_customer on public.vehicles (business_id, customer_id);
create index if not exists idx_vehicles_business_id on public.vehicles (business_id);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  source text not null,
  source_page text,
  lifecycle_status text not null default 'NEW' check (lifecycle_status in ('NEW', 'QUALIFIED', 'CONTACTED', 'QUOTE_SENT', 'BOOKED', 'IN_PROGRESS', 'COMPLETED', 'REVIEW_REQUESTED', 'CLOSED_LOST')),
  utm_source text,
  utm_campaign text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_leads_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_leads_customer
    foreign key (business_id, customer_id)
    references public.customers (business_id, id)
    on delete restrict
    on update cascade
);

create unique index if not exists ux_leads_business_id on public.leads (business_id, id);
create unique index if not exists ux_leads_business_customer_id on public.leads (business_id, customer_id, id);
create index if not exists idx_leads_business_id on public.leads (business_id);
create index if not exists idx_leads_customer_id on public.leads (customer_id);
create index if not exists idx_leads_business_status on public.leads (business_id, lifecycle_status);

create table if not exists public.lead_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  lead_id uuid not null,
  service_name text not null,
  service_slug text,
  base_price numeric(10,2),
  estimated_time text,
  selected_options jsonb default '[]'::jsonb,
  premium_addons jsonb default '[]'::jsonb,
  customer_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_lead_services_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_lead_services_lead
    foreign key (business_id, lead_id)
    references public.leads (business_id, id)
    on delete cascade
    on update cascade
);

create index if not exists idx_lead_services_business_lead on public.lead_services (business_id, lead_id);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  lead_id uuid not null,
  quote_version integer not null default 1,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  total_price numeric(10,2),
  estimated_time text,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_quotes_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_quotes_lead
    foreign key (business_id, lead_id)
    references public.leads (business_id, id)
    on delete cascade
    on update cascade,
  constraint chk_quote_version_positive
    check (quote_version > 0)
);

create unique index if not exists ux_quotes_business_id on public.quotes (business_id, id);
create unique index if not exists ux_quotes_business_lead_id on public.quotes (business_id, lead_id, id);
create index if not exists idx_quotes_business_lead on public.quotes (business_id, lead_id);
create index if not exists idx_quotes_business_status on public.quotes (business_id, status);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  lead_id uuid not null,
  vehicle_id uuid,
  quote_id uuid,
  job_number text,
  title text,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAID')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_amount numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_jobs_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_jobs_customer
    foreign key (business_id, customer_id)
    references public.customers (business_id, id)
    on delete restrict
    on update cascade,
  constraint fk_jobs_lead
    foreign key (business_id, customer_id, lead_id)
    references public.leads (business_id, customer_id, id)
    on delete restrict
    on update cascade,
  constraint fk_jobs_vehicle
    foreign key (business_id, customer_id, vehicle_id)
    references public.vehicles (business_id, customer_id, id)
    on delete restrict
    on update cascade,
  constraint fk_jobs_quote
    foreign key (business_id, lead_id, quote_id)
    references public.quotes (business_id, lead_id, id)
    on delete restrict
    on update cascade,
  constraint chk_jobs_quote_requires_lead
    check (quote_id is null or lead_id is not null)
);

create unique index if not exists ux_jobs_business_id on public.jobs (business_id, id);
create index if not exists idx_jobs_business_customer on public.jobs (business_id, customer_id);
create index if not exists idx_jobs_business_lead on public.jobs (business_id, lead_id);
create index if not exists idx_jobs_business_status on public.jobs (business_id, status);
create unique index if not exists ux_jobs_business_job_number on public.jobs (business_id, job_number) where job_number is not null;

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid,
  lead_id uuid,
  job_id uuid,
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now(),
  constraint fk_activity_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_activity_customer
    foreign key (customer_id) references public.customers (id)
    on delete set null
    on update cascade,
  constraint fk_activity_lead
    foreign key (lead_id) references public.leads (id)
    on delete set null
    on update cascade,
  constraint fk_activity_job
    foreign key (job_id) references public.jobs (id)
    on delete set null
    on update cascade
);

create unique index if not exists ux_activity_log_business_id on public.activity_log (business_id, id);
create index if not exists idx_activity_business_created_at on public.activity_log (business_id, created_at desc);
create index if not exists idx_activity_lead_id on public.activity_log (lead_id);
create index if not exists idx_activity_customer_id on public.activity_log (customer_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists trg_lead_services_updated_at on public.lead_services;
create trigger trg_lead_services_updated_at
  before update on public.lead_services
  for each row execute function public.set_updated_at();

drop trigger if exists trg_quotes_updated_at on public.quotes;
create trigger trg_quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create or replace function public.seed_auto9_business()
returns void as $$
begin
  insert into public.businesses (id, name, slug, status)
  values (
    '00000000-0000-0000-0000-000000000001',
    'AUTO9',
    'auto9',
    'active'
  )
  on conflict (slug)
  do update set
    name = excluded.name,
    status = excluded.status,
    updated_at = now();
end;
$$ language plpgsql;

select public.seed_auto9_business();
