begin;

-- Canonical hybrid manual intake: optional business date and optional time.
-- Existing manual-intake RPC signatures remain unchanged.
-- A time requires a date; only a timed intake creates a calendar event.
-- All writes run in the caller's single PostgreSQL transaction.
create function public.create_manual_dossier_hybrid(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_service_name text,
  p_customer_id uuid default null,
  p_vehicle_id uuid default null,
  p_new_customer_full_name text default null,
  p_new_customer_first_name text default null,
  p_new_customer_last_name text default null,
  p_new_customer_email text default null,
  p_new_customer_phone text default null,
  p_new_customer_city text default null,
  p_base_price numeric default null,
  p_estimated_time text default null,
  p_customer_comment text default null,
  p_performance_date date default null,
  p_performance_time time default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
  v_lead public.leads%rowtype;
  v_event public.crm_calendar_events%rowtype;
  v_lead_id uuid;
  v_customer_id uuid;
  v_no_op boolean;
  v_event_id uuid;
  v_snapshot jsonb;
  v_saved_snapshot jsonb;
  v_snapshot_count integer;
  v_service_name text := trim(coalesce(p_service_name, ''));
  v_comment text := nullif(trim(coalesce(p_customer_comment, '')), '');
  v_new_name text := nullif(trim(coalesce(p_new_customer_full_name, '')), '');
begin
  if p_business_id is null or p_idempotency_key is null then
    raise exception using errcode = '22023',
      message = 'business_id and idempotency_key are required';
  end if;

  if length(v_service_name) = 0 or length(v_service_name) > 200 then
    raise exception using errcode = '22023',
      message = 'service_name is invalid';
  end if;

  if p_performance_time is not null and p_performance_date is null then
    raise exception using errcode = '22023',
      message = 'performance_time requires performance_date';
  end if;

  if (p_customer_id is null) = (v_new_name is null) then
    raise exception using errcode = '22023',
      message = 'Supply exactly one of existing customer or new customer';
  end if;

  if p_customer_id is null and p_vehicle_id is not null then
    raise exception using errcode = '22023',
      message = 'vehicle requires an existing customer';
  end if;

  v_snapshot := jsonb_build_object(
    'service_name', v_service_name,
    'base_price', p_base_price,
    'estimated_time', nullif(trim(coalesce(p_estimated_time, '')), ''),
    'customer_comment', v_comment,
    'performance_date', p_performance_date,
    'performance_time', p_performance_time,
    'customer_id', p_customer_id,
    'vehicle_id', p_vehicle_id,
    'new_customer_full_name', v_new_name,
    'new_customer_first_name', nullif(trim(coalesce(p_new_customer_first_name, '')), ''),
    'new_customer_last_name', nullif(trim(coalesce(p_new_customer_last_name, '')), ''),
    'new_customer_email', nullif(lower(trim(coalesce(p_new_customer_email, ''))), ''),
    'new_customer_phone', nullif(regexp_replace(coalesce(p_new_customer_phone, ''), '\D', '', 'g'), ''),
    'new_customer_city', nullif(trim(coalesce(p_new_customer_city, '')), '')
  );

  if p_customer_id is not null then
    v_result := public.create_manual_lead(
      p_business_id,
      p_idempotency_key,
      p_customer_id,
      v_service_name,
      p_vehicle_id,
      p_base_price,
      p_estimated_time,
      v_comment
    );
  else
    v_result := public.create_manual_lead_with_customer(
      p_business_id,
      p_idempotency_key,
      v_new_name,
      v_service_name,
      p_new_customer_first_name,
      p_new_customer_last_name,
      p_new_customer_email,
      p_new_customer_phone,
      p_new_customer_city,
      p_base_price,
      p_estimated_time,
      v_comment
    );
  end if;

  v_lead_id := nullif(v_result->>'lead_id', '')::uuid;
  v_no_op := (v_result->>'no_op')::boolean;

  if v_lead_id is null or v_no_op is null then
    raise exception using errcode = 'P0001',
      message = 'Manual intake returned an invalid result';
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = v_lead_id
     and idempotency_key = p_idempotency_key
   for update;

  if not found then
    raise exception using errcode = 'P0001',
      message = 'Manual intake lead could not be verified';
  end if;

  v_customer_id := v_lead.customer_id;

  if v_customer_id is null
     or (p_customer_id is not null and v_customer_id is distinct from p_customer_id)
     or v_lead.vehicle_id is distinct from p_vehicle_id then
    raise exception using errcode = '22023',
      message = 'Manual intake ownership mismatch';
  end if;

  if v_no_op then
    select count(*), (jsonb_agg(event_data->'hybrid_intake_snapshot'))->0
      into v_snapshot_count, v_saved_snapshot
      from public.activity_log
     where business_id = p_business_id
       and lead_id = v_lead_id
       and event_type = 'manual.lead.created'
       and event_data ? 'hybrid_intake_snapshot';

    if v_snapshot_count <> 1
       or v_saved_snapshot is distinct from v_snapshot then
      raise exception using errcode = '23505',
        message = 'Idempotency key belongs to a different or legacy intake';
    end if;

  else
    update public.leads
       set performance_date = p_performance_date
     where business_id = p_business_id
       and id = v_lead_id;

    update public.activity_log
       set event_data = event_data || jsonb_build_object(
         'hybrid_intake_snapshot', v_snapshot
       )
     where business_id = p_business_id
       and lead_id = v_lead_id
       and event_type = 'manual.lead.created'
       and event_data->>'lead_id' = v_lead_id::text;

    get diagnostics v_snapshot_count = row_count;
    if v_snapshot_count <> 1 then
      raise exception using errcode = 'P0001',
        message = 'Manual intake creation activity could not be verified';
    end if;
  end if;

  select *
    into v_event
    from public.crm_calendar_events
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if p_performance_time is null then
    if found then
      raise exception using errcode = '23505',
        message = 'Idempotency key already belongs to a timed calendar event';
    end if;
  elsif v_no_op then
    if not found then
      raise exception using errcode = '23505',
        message = 'Timed intake replay has no matching calendar event';
    end if;
  else
    if found then
      raise exception using errcode = '23505',
        message = 'Idempotency key already belongs to a calendar event';
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
      v_service_name,
      v_service_name,
      p_base_price,
      p_performance_date,
      p_performance_time,
      v_comment,
      'CONFIRMED',
      v_lead_id
    )
    returning * into v_event;
  end if;

  if p_performance_time is not null then
    if v_event.lead_id is distinct from v_lead_id
       or v_event.customer_id is distinct from v_customer_id
       or v_event.vehicle_id is distinct from p_vehicle_id
       or (
         not v_no_op
         and (
           v_event.title is distinct from v_service_name
           or v_event.service_name is distinct from v_service_name
           or v_event.event_date is distinct from p_performance_date
           or v_event.event_time is distinct from p_performance_time
           or v_event.price is distinct from p_base_price
           or v_event.notes is distinct from v_comment
         )
       ) then
      raise exception using errcode = '23505',
        message = 'Idempotency key belongs to a different calendar event';
    end if;

    v_event_id := v_event.id;
  end if;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'customer_id', v_customer_id,
    'event_id', v_event_id,
    'no_op', v_no_op
  );
end;
$$;

revoke all on function public.create_manual_dossier_hybrid(
  uuid, uuid, text, uuid, uuid, text, text, text, text, text, text,
  numeric, text, text, date, time
) from public, anon, authenticated;

grant execute on function public.create_manual_dossier_hybrid(
  uuid, uuid, text, uuid, uuid, text, text, text, text, text, text,
  numeric, text, text, date, time
) to service_role;

commit;
