begin;

-- Block concurrent ownership changes between preflight and FK validation.
-- Reads remain available until the constraint DDL takes its required locks.
lock table public.customers, public.crm_subscriptions,
  public.crm_subscription_booking_requests in share row exclusive mode;

do $preflight$
begin
  if exists (
    select 1
    from public.crm_subscriptions s
    left join public.customers c on c.id = s.customer_id
    where c.id is null
       or s.business_id is distinct from c.business_id
  ) then
    raise exception '042 preflight: crm_subscriptions customer/business identity violation'
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
    raise exception '042 preflight: booking request business/customer/subscription identity violation'
      using errcode = '23514';
  end if;
end;
$preflight$;

-- Preserve existing deletion behavior; strengthen identity without rewriting rows.
alter table public.crm_subscriptions
  add constraint fk_crm_subscriptions_customer_tenant
  foreign key (business_id, customer_id)
  references public.customers (business_id, id)
  on delete cascade;

alter table public.crm_subscriptions
  add constraint uq_crm_subscriptions_business_customer_id
  unique (business_id, customer_id, id);

-- This reference also enforces customer tenancy through the subscription FK.
-- No additional booking-request/customer composite FK is necessary.
alter table public.crm_subscription_booking_requests
  add constraint fk_crm_booking_requests_subscription_identity
  foreign key (business_id, customer_id, subscription_id)
  references public.crm_subscriptions (business_id, customer_id, id)
  on delete cascade;

-- Change only access mode; retain objects, size limits and allowed MIME types.
do $privacy$
begin
  update storage.buckets
  set public = false
  where id = 'crm-vehicle-photos';

  if not found then
    raise exception '042 privacy: expected crm-vehicle-photos bucket is missing';
  end if;
end;
$privacy$;

commit;
