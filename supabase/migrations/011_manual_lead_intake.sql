alter table public.leads
  add column if not exists idempotency_key uuid;

create unique index if not exists ux_leads_business_idempotency_key
  on public.leads (business_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.create_manual_lead(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_customer_id uuid,
  p_service_name text,
  p_vehicle_id uuid default null,
  p_base_price numeric default null,
  p_estimated_time text default null,
  p_customer_comment text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_existing_lead public.leads%rowtype;
  v_lead public.leads%rowtype;
  v_customer public.customers%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_lead_service public.lead_services%rowtype;
  v_activity public.activity_log%rowtype;
  v_service_name text := trim(coalesce(p_service_name, ''));
  v_estimated_time text := nullif(trim(coalesce(p_estimated_time, '')), '');
  v_customer_comment text := nullif(trim(coalesce(p_customer_comment, '')), '');
  v_existing_id uuid;
begin
  if p_business_id is null or p_idempotency_key is null or p_customer_id is null then
    raise exception using errcode = '22023', message = 'business_id, idempotency_key and customer_id are required';
  end if;

  if length(v_service_name) = 0 or length(v_service_name) > 200 then
    raise exception using errcode = '22023', message = 'service_name is invalid';
  end if;

  if p_base_price is not null and (p_base_price < 0 or p_base_price > 10000000) then
    raise exception using errcode = '22023', message = 'base_price is invalid';
  end if;

  if v_estimated_time is not null and length(v_estimated_time) > 100 then
    raise exception using errcode = '22023', message = 'estimated_time is invalid';
  end if;

  if v_customer_comment is not null and length(v_customer_comment) > 2000 then
    raise exception using errcode = '22023', message = 'customer_comment is invalid';
  end if;

  select *
    into v_customer
    from public.customers
   where business_id = p_business_id
     and id = p_customer_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Customer not found for the requested business';
  end if;

  if p_vehicle_id is not null then
    select *
      into v_vehicle
      from public.vehicles
     where business_id = p_business_id
       and customer_id = p_customer_id
       and id = p_vehicle_id
     for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Vehicle not found for the requested customer';
    end if;
  end if;

  select *
    into v_existing_lead
    from public.leads
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if found then
    return jsonb_build_object('lead_id', v_existing_lead.id, 'no_op', true);
  end if;

  insert into public.leads (
    business_id,
    idempotency_key,
    customer_id,
    vehicle_id,
    source,
    lifecycle_status,
    notes
  ) values (
    p_business_id,
    p_idempotency_key,
    p_customer_id,
    p_vehicle_id,
    'crm_manual',
    'NEW',
    v_customer_comment
  )
  on conflict (business_id, idempotency_key) where idempotency_key is not null
  do nothing
  returning * into v_lead;

  if not found then
    select *
      into v_existing_lead
      from public.leads
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key
     for update;

    if not found then
      raise exception using errcode = '40001', message = 'Lead creation could not be resolved';
    end if;

    return jsonb_build_object('lead_id', v_existing_lead.id, 'no_op', true);
  end if;

  insert into public.lead_services (
    business_id,
    lead_id,
    service_name,
    base_price,
    estimated_time,
    customer_comment
  ) values (
    p_business_id,
    v_lead.id,
    v_service_name,
    p_base_price,
    v_estimated_time,
    v_customer_comment
  )
  returning * into v_lead_service;

  insert into public.activity_log (
    business_id,
    customer_id,
    lead_id,
    event_type,
    event_data
  ) values (
    p_business_id,
    p_customer_id,
    v_lead.id,
    'manual.lead.created',
    jsonb_build_object(
      'source', 'crm_manual',
      'lead_id', v_lead.id,
      'customer_id', p_customer_id,
      'vehicle_id', p_vehicle_id,
      'lead_service_id', v_lead_service.id
    )
  )
  returning * into v_activity;

  return jsonb_build_object('lead_id', v_lead.id, 'no_op', false);
end;
$$;

revoke all on function public.create_manual_lead(uuid, uuid, uuid, text, uuid, numeric, text, text)
  from public, anon, authenticated;

grant execute on function public.create_manual_lead(uuid, uuid, uuid, text, uuid, numeric, text, text)
  to service_role;
