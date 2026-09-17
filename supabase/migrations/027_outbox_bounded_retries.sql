begin;

alter table public.automation_outbox
  add column quarantined_at timestamptz;

alter table public.automation_outbox
  add constraint ck_automation_outbox_terminal_state
    check (
      not (
        processed_at is not null
        and quarantined_at is not null
      )
    ),
  add constraint ck_automation_outbox_quarantined_not_leased
    check (
      quarantined_at is null
      or
      (lease_token is null and leased_until is null)
    );

update public.automation_outbox
   set quarantined_at = now(),
       lease_token = null,
       leased_until = null
 where processed_at is null
   and quarantined_at is null
   and attempt_count >= 5
   and (
     lease_token is null
     or leased_until <= now()
   );

drop index public.ix_automation_outbox_claimable;

create index ix_automation_outbox_claimable
  on public.automation_outbox (available_at, created_at, id)
  where processed_at is null
    and quarantined_at is null
    and attempt_count < 5;

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

  update public.automation_outbox
     set quarantined_at = now(),
         lease_token = null,
         leased_until = null
   where business_id = p_business_id
     and processed_at is null
     and quarantined_at is null
     and attempt_count >= 5
     and (
       lease_token is null
       or leased_until <= now()
     );

  return query
  with claimable as (
    select o.id
      from public.automation_outbox o
     where o.business_id = p_business_id
       and o.processed_at is null
       and o.quarantined_at is null
       and o.attempt_count < 5
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

  if v_outbox.quarantined_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already quarantined';
  end if;

  if v_outbox.lease_token is distinct from p_lease_token
     or v_outbox.leased_until is null
     or v_outbox.leased_until <= now() then
    raise exception using
      errcode = '40001',
      message = 'Outbox lease is not owned or has expired';
  end if;

  if v_outbox.attempt_count >= 5 then
    update public.automation_outbox
       set quarantined_at = now(),
           lease_token = null,
           leased_until = null,
           last_error = v_error
     where business_id = p_business_id
       and id = p_outbox_id
    returning * into v_outbox;
  else
    update public.automation_outbox
       set available_at = now() + make_interval(secs => p_retry_after_seconds),
           lease_token = null,
           leased_until = null,
           last_error = v_error
     where business_id = p_business_id
       and id = p_outbox_id
    returning * into v_outbox;
  end if;

  return v_outbox;
end
$$;

revoke all on function public.claim_automation_outbox(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_automation_outbox(uuid, integer, integer)
  to service_role;

revoke all on function public.nack_automation_outbox(uuid, uuid, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.nack_automation_outbox(uuid, uuid, uuid, integer, text)
  to service_role;

commit;
