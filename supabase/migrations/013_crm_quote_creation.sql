alter table public.quotes
  add column if not exists idempotency_key uuid;

create unique index if not exists ux_quotes_business_idempotency_key
  on public.quotes (business_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists ux_quotes_business_lead_version
  on public.quotes (business_id, lead_id, quote_version);

create unique index if not exists ux_quotes_business_lead_draft
  on public.quotes (business_id, lead_id)
  where status = 'DRAFT';

create or replace function public.create_crm_quote(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_lead_id uuid,
  p_total_price numeric,
  p_estimated_time text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_lead public.leads%rowtype;
  v_customer public.customers%rowtype;
  v_existing_quote public.quotes%rowtype;
  v_quote public.quotes%rowtype;
  v_activity public.activity_log%rowtype;
  v_estimated_time text := nullif(trim(coalesce(p_estimated_time, '')), '');
  v_snapshot jsonb;
  v_service_count integer;
begin
  if p_business_id is null or p_idempotency_key is null or p_lead_id is null then
    raise exception using errcode = '22023', message = 'business_id, idempotency_key and lead_id are required';
  end if;

  select *
    into v_existing_quote
    from public.quotes
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if found then
    return jsonb_build_object(
      'quote_id', v_existing_quote.id,
      'lead_id', v_existing_quote.lead_id,
      'quote_version', v_existing_quote.quote_version,
      'no_op', true
    );
  end if;

  if p_total_price is null
     or p_total_price::text = 'NaN'
     or p_total_price < 0
     or p_total_price > 10000000
     or p_total_price <> round(p_total_price, 2)
  then
    raise exception using errcode = '22023', message = 'total_price is invalid';
  end if;

  if v_estimated_time is not null and length(v_estimated_time) > 100 then
    raise exception using errcode = '22023', message = 'estimated_time is invalid';
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = p_lead_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Lead not found for the requested business';
  end if;

  select *
    into v_existing_quote
    from public.quotes
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key
   for update;

  if found then
    return jsonb_build_object(
      'quote_id', v_existing_quote.id,
      'lead_id', v_existing_quote.lead_id,
      'quote_version', v_existing_quote.quote_version,
      'no_op', true
    );
  end if;

  if v_lead.lifecycle_status not in ('NEW', 'QUALIFIED', 'CONTACTED') then
    raise exception using errcode = '23514', message = format('Lead status %s cannot create a quote', v_lead.lifecycle_status);
  end if;

  select *
    into v_customer
    from public.customers
   where business_id = p_business_id
     and id = v_lead.customer_id;

  if not found then
    raise exception using errcode = '23503', message = 'Lead customer does not belong to the requested business';
  end if;

  if exists (
    select 1
      from public.quotes
     where business_id = p_business_id
       and lead_id = p_lead_id
  ) then
    raise exception using errcode = '23505', message = 'A quote already exists for this lead';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'service_name', ls.service_name,
          'service_slug', ls.service_slug,
          'base_price', ls.base_price,
          'estimated_time', ls.estimated_time,
          'selected_options', ls.selected_options,
          'premium_addons', ls.premium_addons
        )
        order by ls.id desc
      ),
      '[]'::jsonb
    ),
    count(*)::integer
    into v_snapshot, v_service_count
    from public.lead_services ls
   where ls.business_id = p_business_id
     and ls.lead_id = p_lead_id;

  if v_service_count = 0 then
    raise exception using errcode = '23514', message = 'Lead has no requested services';
  end if;

  insert into public.quotes (
    business_id,
    lead_id,
    idempotency_key,
    quote_version,
    status,
    total_price,
    estimated_time,
    payload_json
  ) values (
    p_business_id,
    p_lead_id,
    p_idempotency_key,
    1,
    'DRAFT',
    round(p_total_price, 2),
    v_estimated_time,
    jsonb_build_object(
      'source', 'crm_manual',
      'services', v_snapshot
    )
  )
  on conflict (business_id, idempotency_key) where idempotency_key is not null
  do nothing
  returning * into v_quote;

  if not found then
    select *
      into v_existing_quote
      from public.quotes
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key
     for update;

    if not found then
      raise exception using errcode = '40001', message = 'Quote creation could not be resolved';
    end if;

    return jsonb_build_object(
      'quote_id', v_existing_quote.id,
      'lead_id', v_existing_quote.lead_id,
      'quote_version', v_existing_quote.quote_version,
      'no_op', true
    );
  end if;

  insert into public.activity_log (
    business_id,
    customer_id,
    lead_id,
    event_type,
    event_data
  ) values (
    p_business_id,
    v_customer.id,
    v_lead.id,
    'quote.created',
    jsonb_build_object(
      'source', 'crm_quote_ui',
      'quote_id', v_quote.id,
      'lead_id', v_lead.id,
      'customer_id', v_customer.id,
      'quote_version', v_quote.quote_version
    )
  ) returning * into v_activity;

  return jsonb_build_object(
    'quote_id', v_quote.id,
    'lead_id', v_quote.lead_id,
    'quote_version', v_quote.quote_version,
    'no_op', false
  );
end;
$$;

revoke all on function public.create_crm_quote(uuid, uuid, uuid, numeric, text)
  from public, anon, authenticated;

grant execute on function public.create_crm_quote(uuid, uuid, uuid, numeric, text)
  to service_role;
