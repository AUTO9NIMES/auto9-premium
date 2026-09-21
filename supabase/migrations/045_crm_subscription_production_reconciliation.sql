begin;

-- Reconcile the subscription schema expected by the current application.
-- Historical migrations 038/040/042 are intentionally left immutable.

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

alter table public.crm_subscriptions enable row level security;
alter table public.crm_subscription_booking_requests enable row level security;

drop policy if exists crm_subscriptions_service_role_all
  on public.crm_subscriptions;

create policy crm_subscriptions_service_role_all
  on public.crm_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists crm_subscription_booking_requests_service_role_all
  on public.crm_subscription_booking_requests;

create policy crm_subscription_booking_requests_service_role_all
  on public.crm_subscription_booking_requests
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.crm_subscriptions from anon;
revoke all on table public.crm_subscriptions from authenticated;
revoke all on table public.crm_subscription_booking_requests from anon;
revoke all on table public.crm_subscription_booking_requests from authenticated;

grant select, insert, update, delete
  on table public.crm_subscriptions
  to service_role;

grant select, insert, update, delete
  on table public.crm_subscription_booking_requests
  to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'crm-vehicle-photos',
  'crm-vehicle-photos',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

lock table public.customers,
  public.crm_subscriptions,
  public.crm_subscription_booking_requests
  in share row exclusive mode;

do $preflight$
begin
  if exists (
    select 1
    from public.crm_subscriptions s
    left join public.customers c on c.id = s.customer_id
    where c.id is null
       or s.business_id is distinct from c.business_id
  ) then
    raise exception
      '045 preflight: crm_subscriptions customer/business identity violation'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.crm_subscription_booking_requests br
    left join public.crm_subscriptions s on s.id = br.subscription_id
    left join public.customers c on c.id = br.customer_id
    where s.id is null
       or c.id is null
       or br.business_id is distinct from s.business_id
       or br.customer_id is distinct from s.customer_id
       or br.business_id is distinct from c.business_id
  ) then
    raise exception
      '045 preflight: booking request business/customer/subscription identity violation'
      using errcode = '23514';
  end if;
end;
$preflight$;

do $constraints$
declare
  existing_definition text;
begin
  select pg_get_constraintdef(oid)
  into existing_definition
  from pg_constraint
  where conrelid = 'public.crm_subscriptions'::regclass
    and conname = 'fk_crm_subscriptions_customer_tenant';

  if existing_definition is null then
    alter table public.crm_subscriptions
      add constraint fk_crm_subscriptions_customer_tenant
      foreign key (business_id, customer_id)
      references public.customers (business_id, id)
      on delete cascade;
  elsif existing_definition <>
    'FOREIGN KEY (business_id, customer_id) REFERENCES customers(business_id, id) ON DELETE CASCADE'
  then
    raise exception
      '045 constraint drift: fk_crm_subscriptions_customer_tenant = %',
      existing_definition
      using errcode = '23514';
  end if;

  existing_definition := null;

  select pg_get_constraintdef(oid)
  into existing_definition
  from pg_constraint
  where conrelid = 'public.crm_subscriptions'::regclass
    and conname = 'uq_crm_subscriptions_business_customer_id';

  if existing_definition is null then
    alter table public.crm_subscriptions
      add constraint uq_crm_subscriptions_business_customer_id
      unique (business_id, customer_id, id);
  elsif existing_definition <>
    'UNIQUE (business_id, customer_id, id)'
  then
    raise exception
      '045 constraint drift: uq_crm_subscriptions_business_customer_id = %',
      existing_definition
      using errcode = '23514';
  end if;

  existing_definition := null;

  select pg_get_constraintdef(oid)
  into existing_definition
  from pg_constraint
  where conrelid = 'public.crm_subscription_booking_requests'::regclass
    and conname = 'fk_crm_booking_requests_subscription_identity';

  if existing_definition is null then
    alter table public.crm_subscription_booking_requests
      add constraint fk_crm_booking_requests_subscription_identity
      foreign key (business_id, customer_id, subscription_id)
      references public.crm_subscriptions (business_id, customer_id, id)
      on delete cascade;
  elsif existing_definition <>
    'FOREIGN KEY (business_id, customer_id, subscription_id) REFERENCES crm_subscriptions(business_id, customer_id, id) ON DELETE CASCADE'
  then
    raise exception
      '045 constraint drift: fk_crm_booking_requests_subscription_identity = %',
      existing_definition
      using errcode = '23514';
  end if;
end;
$constraints$;

commit;
