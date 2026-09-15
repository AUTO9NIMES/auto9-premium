begin;

-- Reliable Automation Outbox Consumption Protocol V1.
--
-- Guarantees:
-- - at-least-once consumption semantics
-- - atomic concurrent claims via FOR UPDATE SKIP LOCKED
-- - expiring leases recoverable after consumer crashes
-- - lease-token ownership for ACK / NACK
-- - retry scheduling without claiming external delivery
--
-- This migration does not implement a worker or provider delivery.

alter table public.automation_outbox
  add column available_at timestamptz not null default now(),
  add column attempt_count integer not null default 0,
  add column lease_token uuid,
  add column leased_until timestamptz,
  add column processed_at timestamptz,
  add column last_error text;

alter table public.automation_outbox
  add constraint ck_automation_outbox_attempt_count
    check (attempt_count >= 0),
  add constraint ck_automation_outbox_lease_pair
    check (
      (lease_token is null and leased_until is null)
      or
      (lease_token is not null and leased_until is not null)
    ),
  add constraint ck_automation_outbox_processed_not_leased
    check (
      processed_at is null
      or
      (lease_token is null and leased_until is null)
    );

create index ix_automation_outbox_claimable
  on public.automation_outbox (available_at, created_at, id)
  where processed_at is null;

create or replace function public.claim_automation_outbox(
  p_business_id uuid,
  p_limit integer default 10,
  p_lease_seconds integer default 300
)
returns setof public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_business_id is null then
    raise exception using
      errcode = '22023',
      message = 'business_id is required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using
      errcode = '22023',
      message = 'p_limit must be between 1 and 100';
  end if;

  if p_lease_seconds is null
     or p_lease_seconds < 30
     or p_lease_seconds > 3600 then
    raise exception using
      errcode = '22023',
      message = 'p_lease_seconds must be between 30 and 3600';
  end if;

  return query
  with claimable as (
    select o.id
      from public.automation_outbox o
     where o.business_id = p_business_id
       and o.processed_at is null
       and o.available_at <= now()
       and (
         o.lease_token is null
         or o.leased_until <= now()
       )
     order by o.available_at, o.created_at, o.id
     for update skip locked
     limit p_limit
  )
  update public.automation_outbox o
     set lease_token = gen_random_uuid(),
         leased_until = now() + make_interval(secs => p_lease_seconds),
         attempt_count = o.attempt_count + 1
    from claimable c
   where o.id = c.id
  returning o.*;
end
$$;

create or replace function public.ack_automation_outbox(
  p_business_id uuid,
  p_outbox_id uuid,
  p_lease_token uuid
)
returns public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_outbox public.automation_outbox;
begin
  if p_business_id is null or p_outbox_id is null or p_lease_token is null then
    raise exception using
      errcode = '22023',
      message = 'business_id, outbox_id and lease_token are required';
  end if;

  select *
    into v_outbox
    from public.automation_outbox
   where business_id = p_business_id
     and id = p_outbox_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Outbox event not found';
  end if;

  if v_outbox.processed_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already processed';
  end if;

  if v_outbox.lease_token is distinct from p_lease_token
     or v_outbox.leased_until is null
     or v_outbox.leased_until <= now() then
    raise exception using
      errcode = '40001',
      message = 'Outbox lease is not owned or has expired';
  end if;

  update public.automation_outbox
     set processed_at = now(),
         lease_token = null,
         leased_until = null,
         last_error = null
   where business_id = p_business_id
     and id = p_outbox_id
  returning * into v_outbox;

  return v_outbox;
end
$$;

create or replace function public.nack_automation_outbox(
  p_business_id uuid,
  p_outbox_id uuid,
  p_lease_token uuid,
  p_retry_after_seconds integer,
  p_error text default null
)
returns public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_outbox public.automation_outbox;
  v_error text;
begin
  if p_business_id is null
     or p_outbox_id is null
     or p_lease_token is null
     or p_retry_after_seconds is null then
    raise exception using
      errcode = '22023',
      message = 'business_id, outbox_id, lease_token and retry_after_seconds are required';
  end if;

  if p_retry_after_seconds < 0 or p_retry_after_seconds > 86400 then
    raise exception using
      errcode = '22023',
      message = 'p_retry_after_seconds must be between 0 and 86400';
  end if;

  v_error := nullif(left(trim(coalesce(p_error, '')), 1000), '');

  select *
    into v_outbox
    from public.automation_outbox
   where business_id = p_business_id
     and id = p_outbox_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Outbox event not found';
  end if;

  if v_outbox.processed_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already processed';
  end if;

  if v_outbox.lease_token is distinct from p_lease_token
     or v_outbox.leased_until is null
     or v_outbox.leased_until <= now() then
    raise exception using
      errcode = '40001',
      message = 'Outbox lease is not owned or has expired';
  end if;

  update public.automation_outbox
     set available_at = now() + make_interval(secs => p_retry_after_seconds),
         lease_token = null,
         leased_until = null,
         last_error = v_error
   where business_id = p_business_id
     and id = p_outbox_id
  returning * into v_outbox;

  return v_outbox;
end
$$;

revoke all on function public.claim_automation_outbox(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_automation_outbox(uuid, integer, integer)
  to service_role;

revoke all on function public.ack_automation_outbox(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.ack_automation_outbox(uuid, uuid, uuid)
  to service_role;

revoke all on function public.nack_automation_outbox(uuid, uuid, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.nack_automation_outbox(uuid, uuid, uuid, integer, text)
  to service_role;

-- Consumption mutates lease/retry/processed state. Preserve the existing
-- SELECT/INSERT producer privileges while adding only UPDATE for service_role.
grant update on table public.automation_outbox to service_role;

commit;
