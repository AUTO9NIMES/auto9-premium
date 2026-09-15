alter table public.vehicles
  add column if not exists idempotency_key uuid;

create unique index if not exists ux_vehicles_business_idempotency_key
  on public.vehicles (business_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.create_customer_vehicle(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_customer_id uuid,
  p_brand text,
  p_model text,
  p_variant text default null,
  p_year integer default null,
  p_color text default null,
  p_plate text default null,
  p_mileage_km integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_customer public.customers%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_existing_vehicle public.vehicles%rowtype;
  v_activity public.activity_log%rowtype;
  v_brand text := nullif(trim(coalesce(p_brand, '')), '');
  v_model text := nullif(trim(coalesce(p_model, '')), '');
  v_variant text := nullif(trim(coalesce(p_variant, '')), '');
  v_color text := nullif(trim(coalesce(p_color, '')), '');
  v_plate text := nullif(trim(coalesce(p_plate, '')), '');
begin
  if p_business_id is null or p_idempotency_key is null or p_customer_id is null then
    raise exception using errcode = '22023', message = 'business_id, idempotency_key and customer_id are required';
  end if;

  select *
    into v_existing_vehicle
    from public.vehicles
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if found then
    if v_existing_vehicle.customer_id is distinct from p_customer_id then
      raise exception using errcode = '23505', message = 'Vehicle request token belongs to another customer';
    end if;

    return jsonb_build_object(
      'vehicle_id', v_existing_vehicle.id,
      'customer_id', v_existing_vehicle.customer_id,
      'no_op', true
    );
  end if;

  if v_brand is null or length(v_brand) > 100 then
    raise exception using errcode = '22023', message = 'brand is invalid';
  end if;

  if v_model is null or length(v_model) > 100 then
    raise exception using errcode = '22023', message = 'model is invalid';
  end if;

  if v_variant is not null and length(v_variant) > 100 then
    raise exception using errcode = '22023', message = 'variant is invalid';
  end if;

  if v_color is not null and length(v_color) > 100 then
    raise exception using errcode = '22023', message = 'color is invalid';
  end if;

  if v_plate is not null and length(v_plate) > 32 then
    raise exception using errcode = '22023', message = 'plate is invalid';
  end if;

  if p_year is not null and (p_year < 1900 or p_year > 2100) then
    raise exception using errcode = '22023', message = 'year is invalid';
  end if;

  if p_mileage_km is not null and p_mileage_km < 0 then
    raise exception using errcode = '22023', message = 'mileage is invalid';
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

  select *
    into v_existing_vehicle
    from public.vehicles
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if found then
    if v_existing_vehicle.customer_id is distinct from p_customer_id then
      raise exception using errcode = '23505', message = 'Vehicle request token belongs to another customer';
    end if;

    return jsonb_build_object(
      'vehicle_id', v_existing_vehicle.id,
      'customer_id', v_existing_vehicle.customer_id,
      'no_op', true
    );
  end if;

  insert into public.vehicles (
    business_id,
    customer_id,
    idempotency_key,
    brand,
    model,
    variant,
    year,
    color,
    plate,
    mileage_km
  ) values (
    p_business_id,
    p_customer_id,
    p_idempotency_key,
    v_brand,
    v_model,
    v_variant,
    p_year,
    v_color,
    v_plate,
    p_mileage_km
  )
  on conflict (business_id, idempotency_key) where idempotency_key is not null
  do nothing
  returning * into v_vehicle;

  if not found then
    select *
      into v_existing_vehicle
      from public.vehicles
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key
     for update;

    if not found then
      raise exception using errcode = '40001', message = 'Vehicle creation could not be resolved';
    end if;

    if v_existing_vehicle.customer_id is distinct from p_customer_id then
      raise exception using errcode = '23505', message = 'Vehicle request token belongs to another customer';
    end if;

    return jsonb_build_object(
      'vehicle_id', v_existing_vehicle.id,
      'customer_id', v_existing_vehicle.customer_id,
      'no_op', true
    );
  end if;

  insert into public.activity_log (
    business_id,
    customer_id,
    event_type,
    event_data
  ) values (
    p_business_id,
    p_customer_id,
    'vehicle.created',
    jsonb_build_object(
      'source', 'crm_vehicle_ui',
      'vehicle_id', v_vehicle.id,
      'customer_id', p_customer_id
    )
  ) returning * into v_activity;

  return jsonb_build_object(
    'vehicle_id', v_vehicle.id,
    'customer_id', v_vehicle.customer_id,
    'no_op', false
  );
end;
$$;

revoke all on function public.create_customer_vehicle(uuid, uuid, uuid, text, text, text, integer, text, text, integer)
  from public, anon, authenticated;

grant execute on function public.create_customer_vehicle(uuid, uuid, uuid, text, text, text, integer, text, text, integer)
  to service_role;
