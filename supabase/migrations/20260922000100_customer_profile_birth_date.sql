create or replace function public.update_customer_profile(
  p_business_id uuid,
  p_customer_id uuid,
  p_full_name text,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_phone text default null,
  p_city text default null,
  p_source text default 'internal',
  p_birth_date date default null
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_customer public.customers%rowtype;
  v_activity public.activity_log%rowtype;
  v_full_name text := trim(coalesce(p_full_name, ''));
  v_first_name text := nullif(trim(coalesce(p_first_name, '')), '');
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone_raw text := nullif(trim(coalesce(p_phone, '')), '');
  v_phone text;
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_source text := coalesce(nullif(trim(p_source), ''), 'internal');
  v_birth_date date := p_birth_date;
  v_changed_fields text[] := array[]::text[];
  v_existing_identifier uuid;
begin
  if p_business_id is null or p_customer_id is null then
    raise exception using errcode = '22023', message = 'business_id and customer_id are required';
  end if;

  if length(v_full_name) = 0 or length(v_full_name) > 200 then
    raise exception using errcode = '22023', message = 'full_name is invalid';
  end if;
  if v_first_name is not null and length(v_first_name) > 100 then
    raise exception using errcode = '22023', message = 'first_name is invalid';
  end if;
  if v_last_name is not null and length(v_last_name) > 100 then
    raise exception using errcode = '22023', message = 'last_name is invalid';
  end if;
  if v_email is not null then
    if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception using errcode = '22023', message = 'email is invalid';
    end if;
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
  if v_city is not null and length(v_city) > 120 then
    raise exception using errcode = '22023', message = 'city is invalid';
  end if;

  select * into v_customer
    from public.customers
   where business_id = p_business_id and id = p_customer_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Customer not found for the requested business';
  end if;

  if v_customer.full_name is distinct from v_full_name then v_changed_fields := array_append(v_changed_fields, 'full_name'); end if;
  if v_customer.first_name is distinct from v_first_name then v_changed_fields := array_append(v_changed_fields, 'first_name'); end if;
  if v_customer.last_name is distinct from v_last_name then v_changed_fields := array_append(v_changed_fields, 'last_name'); end if;
  if nullif(lower(trim(coalesce(v_customer.email, ''))), '') is distinct from v_email then v_changed_fields := array_append(v_changed_fields, 'email'); end if;
  if nullif(regexp_replace(coalesce(v_customer.phone, ''), '\D', '', 'g'), '') is distinct from v_phone then v_changed_fields := array_append(v_changed_fields, 'phone'); end if;
  if v_customer.city is distinct from v_city then v_changed_fields := array_append(v_changed_fields, 'city'); end if;
  if v_customer.birth_date is distinct from v_birth_date then v_changed_fields := array_append(v_changed_fields, 'birth_date'); end if;

  if cardinality(v_changed_fields) = 0 then
    return jsonb_build_object('customer', to_jsonb(v_customer), 'changed_fields', jsonb_build_array(), 'activity', null, 'no_op', true);
  end if;

  if v_email is not null then
    select id into v_existing_identifier from public.customers
     where business_id = p_business_id and id <> p_customer_id
       and lower(trim(coalesce(email, ''))) = v_email
     for update;
    if found then
      raise exception using errcode = '23505', message = 'Email already belongs to another customer';
    end if;

    select id into v_existing_identifier from public.customer_identifiers
     where business_id = p_business_id and identifier_type = 'email'
       and normalized_value = v_email and customer_id <> p_customer_id
     for update;
    if found then
      raise exception using errcode = '23505', message = 'Email identifier already belongs to another customer';
    end if;
  end if;

  if v_phone is not null then
    select id into v_existing_identifier from public.customers
     where business_id = p_business_id and id <> p_customer_id
       and nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') = v_phone
     for update;
    if found then
      raise exception using errcode = '23505', message = 'Phone already belongs to another customer';
    end if;

    select id into v_existing_identifier from public.customer_identifiers
     where business_id = p_business_id and identifier_type = 'phone'
       and normalized_value = v_phone and customer_id <> p_customer_id
     for update;
    if found then
      raise exception using errcode = '23505', message = 'Phone identifier already belongs to another customer';
    end if;
  end if;

  update public.customers
     set full_name = v_full_name,
         first_name = v_first_name,
         last_name = v_last_name,
         email = v_email,
         phone = v_phone,
         city = v_city,
         birth_date = v_birth_date,
         updated_at = now()
   where business_id = p_business_id and id = p_customer_id
   returning * into v_customer;

  delete from public.customer_identifiers
   where business_id = p_business_id and customer_id = p_customer_id
     and identifier_type in ('email', 'phone');

  if v_email is not null then
    insert into public.customer_identifiers (
      business_id, customer_id, identifier_type, identifier_value, normalized_value, source, is_primary
    ) values (
      p_business_id, p_customer_id, 'email', v_email, v_email, v_source, true
    );
  end if;

  if v_phone is not null then
    insert into public.customer_identifiers (
      business_id, customer_id, identifier_type, identifier_value, normalized_value, source, is_primary
    ) values (
      p_business_id, p_customer_id, 'phone', v_phone, v_phone, v_source, true
    );
  end if;

  insert into public.activity_log (business_id, customer_id, event_type, event_data)
  values (
    p_business_id,
    p_customer_id,
    'customer.profile_updated',
    jsonb_build_object('source', v_source, 'changed_fields', to_jsonb(v_changed_fields))
  )
  returning * into v_activity;

  return jsonb_build_object(
    'customer', to_jsonb(v_customer),
    'changed_fields', to_jsonb(v_changed_fields),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$function$;

revoke all on function public.update_customer_profile(uuid, uuid, text, text, text, text, text, text, text, date) from public;
revoke all on function public.update_customer_profile(uuid, uuid, text, text, text, text, text, text, text, date) from anon;
revoke all on function public.update_customer_profile(uuid, uuid, text, text, text, text, text, text, text, date) from authenticated;
grant execute on function public.update_customer_profile(uuid, uuid, text, text, text, text, text, text, text, date) to service_role;
