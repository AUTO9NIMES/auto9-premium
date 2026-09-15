alter table public.customers
  add column if not exists idempotency_key uuid;

create unique index if not exists ux_customers_business_idempotency_key
  on public.customers (business_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.create_manual_lead_with_customer(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_full_name text,
  p_service_name text,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_phone text default null,
  p_city text default null,
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
  v_customer public.customers%rowtype;
  v_existing_customer public.customers%rowtype;
  v_lead public.leads%rowtype;
  v_lead_service public.lead_services%rowtype;
  v_activity public.activity_log%rowtype;
  v_full_name text := trim(coalesce(p_full_name, ''));
  v_first_name text := nullif(trim(coalesce(p_first_name, '')), '');
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone_raw text := nullif(trim(coalesce(p_phone, '')), '');
  v_phone text;
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_service_name text := trim(coalesce(p_service_name, ''));
  v_estimated_time text := nullif(trim(coalesce(p_estimated_time, '')), '');
  v_customer_comment text := nullif(trim(coalesce(p_customer_comment, '')), '');
  v_lead_service_id uuid;
begin
  if p_business_id is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'business_id and idempotency_key are required';
  end if;

  select *
    into v_existing_customer
    from public.customers
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if found then
    select *
      into v_lead
      from public.leads
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key
     for update;

    if not found then
      raise exception using errcode = '40001', message = 'Manual lead replay could not be resolved';
    end if;

    return jsonb_build_object('lead_id', v_lead.id, 'customer_id', v_existing_customer.id, 'no_op', true);
  end if;

  if length(v_full_name) = 0 or length(v_full_name) > 200 then
    raise exception using errcode = '22023', message = 'full_name is invalid';
  end if;

  if length(v_first_name) > 100 or length(v_last_name) > 100 then
    raise exception using errcode = '22023', message = 'name field is invalid';
  end if;

  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception using errcode = '22023', message = 'email is invalid';
  end if;

  if v_phone_raw is not null then
    if length(v_phone_raw) > 40 then
      raise exception using errcode = '22023', message = 'phone is invalid';
    end if;
    v_phone := nullif(regexp_replace(v_phone_raw, '\D', '', 'g'), '');
    if v_phone is null or length(v_phone) < 7 or length(v_phone) > 15 then
      raise exception using errcode = '22023', message = 'phone is invalid';
    end if;
  end if;

  if v_email is null and v_phone is null then
    raise exception using errcode = '22023', message = 'email or phone is required';
  end if;

  if length(v_city) > 120 or length(v_service_name) = 0 or length(v_service_name) > 200 then
    raise exception using errcode = '22023', message = 'profile or service field is invalid';
  end if;

  if v_estimated_time is not null and length(v_estimated_time) > 100 then
    raise exception using errcode = '22023', message = 'estimated_time is invalid';
  end if;

  if v_customer_comment is not null and length(v_customer_comment) > 2000 then
    raise exception using errcode = '22023', message = 'customer_comment is invalid';
  end if;

  if p_base_price is not null and (p_base_price < 0 or p_base_price > 10000000) then
    raise exception using errcode = '22023', message = 'base_price is invalid';
  end if;

  insert into public.customers (
    business_id, idempotency_key, full_name, first_name, last_name, email, phone, city, source
  ) values (
    p_business_id, p_idempotency_key, v_full_name, v_first_name, v_last_name, v_email, v_phone, v_city, 'crm_manual'
  )
  on conflict (business_id, idempotency_key) where idempotency_key is not null
  do nothing
  returning * into v_customer;

  if not found then
    select *
      into v_existing_customer
      from public.customers
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key
     for update;

    select *
      into v_lead
      from public.leads
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key
     for update;

    if not found then
      raise exception using errcode = '40001', message = 'Manual lead replay could not be resolved';
    end if;

    if not found or v_existing_customer.id is null then
      raise exception using errcode = '40001', message = 'Manual lead replay could not be resolved';
    end if;

    return jsonb_build_object('lead_id', v_lead.id, 'customer_id', v_existing_customer.id, 'no_op', true);
  end if;

  if v_email is not null then
    if exists (select 1 from public.customers where business_id = p_business_id and id <> v_customer.id and lower(trim(coalesce(email, ''))) = v_email) then
      raise exception using errcode = '23505', message = 'Email already belongs to another customer';
    end if;
    if exists (select 1 from public.customer_identifiers where business_id = p_business_id and identifier_type = 'email' and normalized_value = v_email) then
      raise exception using errcode = '23505', message = 'Email identifier already belongs to another customer';
    end if;
  end if;

  if v_phone is not null then
    if exists (select 1 from public.customers where business_id = p_business_id and id <> v_customer.id and nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') = v_phone) then
      raise exception using errcode = '23505', message = 'Phone already belongs to another customer';
    end if;
    if exists (select 1 from public.customer_identifiers where business_id = p_business_id and identifier_type = 'phone' and normalized_value = v_phone) then
      raise exception using errcode = '23505', message = 'Phone identifier already belongs to another customer';
    end if;
  end if;

  if v_email is not null then
    insert into public.customer_identifiers (
      business_id, customer_id, identifier_type, identifier_value, normalized_value, source, is_primary
    ) values (p_business_id, v_customer.id, 'email', v_email, v_email, 'crm_manual', true);
  end if;

  if v_phone is not null then
    insert into public.customer_identifiers (
      business_id, customer_id, identifier_type, identifier_value, normalized_value, source, is_primary
    ) values (p_business_id, v_customer.id, 'phone', v_phone, v_phone, 'crm_manual', true);
  end if;

  insert into public.leads (
    business_id, idempotency_key, customer_id, vehicle_id, source, lifecycle_status, notes
  ) values (
    p_business_id, p_idempotency_key, v_customer.id, null, 'crm_manual', 'NEW', v_customer_comment
  ) returning * into v_lead;

  insert into public.lead_services (
    business_id, lead_id, service_name, base_price, estimated_time, customer_comment
  ) values (
    p_business_id, v_lead.id, v_service_name, p_base_price, v_estimated_time, v_customer_comment
  ) returning id into v_lead_service_id;

  insert into public.activity_log (
    business_id, customer_id, lead_id, event_type, event_data
  ) values (
    p_business_id, v_customer.id, v_lead.id, 'manual.lead.created',
    jsonb_build_object(
      'source', 'crm_manual',
      'lead_id', v_lead.id,
      'customer_id', v_customer.id,
      'vehicle_id', null,
      'lead_service_id', v_lead_service_id
    )
  ) returning * into v_activity;

  return jsonb_build_object('lead_id', v_lead.id, 'customer_id', v_customer.id, 'no_op', false);
end;
$$;

revoke all on function public.create_manual_lead_with_customer(uuid, uuid, text, text, text, text, text, text, text, numeric, text, text)
  from public, anon, authenticated;

grant execute on function public.create_manual_lead_with_customer(uuid, uuid, text, text, text, text, text, text, text, numeric, text, text)
  to service_role;
