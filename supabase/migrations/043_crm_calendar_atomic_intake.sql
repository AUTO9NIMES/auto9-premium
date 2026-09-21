-- Canonical Calendar Ultra atomic intake.
--
-- Guarantees:
-- - calendar-event creation and pipeline-lead creation are one PostgreSQL transaction;
-- - replay is idempotent per business;
-- - existing customer/vehicle relationships stay tenant-scoped;
-- - new customer + lead uses the canonical manual-intake primitive;
-- - no operational appointment/job is created or mutated here.

alter table public.crm_calendar_events
  add column if not exists idempotency_key uuid;

create unique index if not exists ux_crm_calendar_events_business_idempotency
  on public.crm_calendar_events (business_id, idempotency_key)
  where idempotency_key is not null;


create or replace function public.create_crm_calendar_event_with_lead(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_title text,
  p_service_name text,
  p_event_date date,
  p_event_time time,
  p_customer_id uuid default null,
  p_vehicle_id uuid default null,
  p_price numeric default null,
  p_notes text default null,
  p_new_customer_full_name text default null,
  p_new_customer_first_name text default null,
  p_new_customer_last_name text default null,
  p_new_customer_email text default null,
  p_new_customer_phone text default null,
  p_new_customer_city text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_existing_event public.crm_calendar_events%rowtype;
  v_event public.crm_calendar_events%rowtype;

  v_customer_id uuid := p_customer_id;
  v_lead_id uuid;

  v_lead_result jsonb;

  v_title text := trim(coalesce(p_title, ''));
  v_service_name text := nullif(trim(coalesce(p_service_name, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');

  v_new_customer_full_name text :=
    nullif(trim(coalesce(p_new_customer_full_name, '')), '');
begin
  if p_business_id is null or p_idempotency_key is null then
    raise exception using
      errcode = '22023',
      message = 'business_id and idempotency_key are required';
  end if;

  if length(v_title) = 0 or length(v_title) > 200 then
    raise exception using
      errcode = '22023',
      message = 'title is invalid';
  end if;

  if v_service_name is not null and length(v_service_name) > 200 then
    raise exception using
      errcode = '22023',
      message = 'service_name is invalid';
  end if;

  if p_event_date is null or p_event_time is null then
    raise exception using
      errcode = '22023',
      message = 'event_date and event_time are required';
  end if;

  if p_price is not null and (p_price < 0 or p_price > 10000000) then
    raise exception using
      errcode = '22023',
      message = 'price is invalid';
  end if;

  if v_notes is not null and length(v_notes) > 2000 then
    raise exception using
      errcode = '22023',
      message = 'notes is invalid';
  end if;

  select *
    into v_existing_event
    from public.crm_calendar_events
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if found then
    if v_existing_event.title is distinct from v_title
       or v_existing_event.service_name is distinct from v_service_name
       or v_existing_event.event_date is distinct from p_event_date
       or v_existing_event.event_time is distinct from p_event_time
       or v_existing_event.price is distinct from p_price
       or v_existing_event.notes is distinct from v_notes
       or (
         p_customer_id is not null
         and v_existing_event.customer_id is distinct from p_customer_id
       )
       or (
         p_vehicle_id is not null
         and v_existing_event.vehicle_id is distinct from p_vehicle_id
       )
    then
      raise exception using
        errcode = '23505',
        message = 'Idempotency key already belongs to a different calendar event';
    end if;

    return jsonb_build_object(
      'event_id', v_existing_event.id,
      'customer_id', v_existing_event.customer_id,
      'lead_id', v_existing_event.lead_id,
      'no_op', true
    );
  end if;

  if v_customer_id is not null and v_new_customer_full_name is not null then
    raise exception using
      errcode = '22023',
      message = 'existing customer and new customer cannot both be supplied';
  end if;

  if v_customer_id is null and p_vehicle_id is not null then
    raise exception using
      errcode = '22023',
      message = 'vehicle requires a customer';
  end if;

  if v_customer_id is null and v_new_customer_full_name is not null then
    v_lead_result := public.create_manual_lead_with_customer(
      p_business_id,
      p_idempotency_key,
      v_new_customer_full_name,
      coalesce(v_service_name, v_title),
      p_new_customer_first_name,
      p_new_customer_last_name,
      p_new_customer_email,
      p_new_customer_phone,
      p_new_customer_city,
      p_price,
      null,
      coalesce(
        v_notes,
        'RDV créé depuis le calendrier pour le '
          || p_event_date::text
          || ' à '
          || p_event_time::text
      )
    );

    v_customer_id := nullif(v_lead_result->>'customer_id', '')::uuid;
    v_lead_id := nullif(v_lead_result->>'lead_id', '')::uuid;

    if v_customer_id is null or v_lead_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'new customer lead intake returned an invalid result';
    end if;

  elsif v_customer_id is not null then
    v_lead_result := public.create_manual_lead(
      p_business_id,
      p_idempotency_key,
      v_customer_id,
      coalesce(v_service_name, v_title),
      p_vehicle_id,
      p_price,
      null,
      coalesce(
        v_notes,
        'RDV créé depuis le calendrier pour le '
          || p_event_date::text
          || ' à '
          || p_event_time::text
      )
    );

    v_lead_id := nullif(v_lead_result->>'lead_id', '')::uuid;

    if v_lead_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'manual lead intake returned an invalid result';
    end if;
  end if;

  insert into public.crm_calendar_events (
    business_id,
    idempotency_key,
    customer_id,
    vehicle_id,
    title,
    service_name,
    price,
    event_date,
    event_time,
    notes,
    status,
    lead_id
  ) values (
    p_business_id,
    p_idempotency_key,
    v_customer_id,
    p_vehicle_id,
    v_title,
    v_service_name,
    p_price,
    p_event_date,
    p_event_time,
    v_notes,
    'CONFIRMED',
    v_lead_id
  )
  on conflict (business_id, idempotency_key)
    where idempotency_key is not null
  do nothing
  returning * into v_event;

  if not found then
    select *
      into v_existing_event
      from public.crm_calendar_events
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key
     for update;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'Calendar event creation could not be resolved';
    end if;

    if v_existing_event.title is distinct from v_title
       or v_existing_event.service_name is distinct from v_service_name
       or v_existing_event.event_date is distinct from p_event_date
       or v_existing_event.event_time is distinct from p_event_time
       or v_existing_event.price is distinct from p_price
       or v_existing_event.notes is distinct from v_notes
       or (
         p_customer_id is not null
         and v_existing_event.customer_id is distinct from p_customer_id
       )
       or (
         p_vehicle_id is not null
         and v_existing_event.vehicle_id is distinct from p_vehicle_id
       )
    then
      raise exception using
        errcode = '23505',
        message = 'Idempotency key already belongs to a different calendar event';
    end if;

    return jsonb_build_object(
      'event_id', v_existing_event.id,
      'customer_id', v_existing_event.customer_id,
      'lead_id', v_existing_event.lead_id,
      'no_op', true
    );
  end if;

  return jsonb_build_object(
    'event_id', v_event.id,
    'customer_id', v_event.customer_id,
    'lead_id', v_event.lead_id,
    'no_op', false
  );
end;
$$;


revoke all on function public.create_crm_calendar_event_with_lead(
  uuid,
  uuid,
  text,
  text,
  date,
  time,
  uuid,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_crm_calendar_event_with_lead(
  uuid,
  uuid,
  text,
  text,
  date,
  time,
  uuid,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
