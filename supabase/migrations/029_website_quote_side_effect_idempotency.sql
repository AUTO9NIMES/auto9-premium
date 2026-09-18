begin;

-- Website Quote Side-Effect Idempotency.
--
-- A website submission now carries a durable SHA-256 fingerprint.
-- Once a submission ID is committed, a replay must present the same
-- fingerprint before any external Blob or email side effect can continue.
--
-- Historical rows remain nullable because their original complete
-- request/photo identity cannot be reconstructed safely.

alter table public.leads
  add column if not exists website_submission_fingerprint text;

alter table public.leads
  drop constraint if exists chk_leads_website_submission_fingerprint;

alter table public.leads
  add constraint chk_leads_website_submission_fingerprint
  check (
    website_submission_fingerprint is null
    or website_submission_fingerprint ~ '^[0-9a-f]{64}$'
  );

-- The fingerprint parameter changes the PostgreSQL function identity.
-- Remove the previous 21-argument RPC so it cannot survive as an overload.
revoke all on function public.create_website_quote_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  jsonb,
  jsonb,
  numeric,
  text
)
  from public, anon, authenticated, service_role;

drop function public.create_website_quote_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  jsonb,
  jsonb,
  numeric,
  text
);

-- Atomic Website Intake V1.
--
-- The public website remains a server-mediated client:
-- - business identity is resolved server-side
-- - the browser never supplies business_id
-- - all CRM persistence for one website submission is atomic
-- - submission idempotency is scoped by business_id
--
-- External effects such as Blob uploads and email delivery are intentionally
-- outside this database transaction.

create or replace function public.create_website_quote_request(
  p_business_id uuid,
  p_submission_id uuid,
  p_submission_fingerprint text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_customer_city text default null,
  p_source text default 'website',
  p_source_page text default '/devis',
  p_utm_source text default null,
  p_utm_campaign text default null,
  p_customer_comment text default null,
  p_vehicle_name text default null,
  p_vehicle_type text default null,
  p_service_name text default 'Prestation',
  p_service_slug text default null,
  p_base_price numeric default null,
  p_estimated_time text default null,
  p_selected_options jsonb default '[]'::jsonb,
  p_premium_addons jsonb default '[]'::jsonb,
  p_total_price numeric default 0,
  p_availability_datetime text default null
)
returns table (
  customer_id uuid,
  vehicle_id uuid,
  lead_id uuid,
  quote_id uuid
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_customer_id uuid;
  v_email_customer_id uuid;
  v_phone_customer_id uuid;
  v_vehicle_id uuid;
  v_lead_id uuid;
  v_quote_id uuid;

  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_customer_city text;
  v_phone_normalized text;
  v_email_normalized text;

  v_existing_lead public.leads;
  v_submission_fingerprint text;
begin
  if p_business_id is null
     or p_submission_id is null
     or p_submission_fingerprint is null then
    raise exception using
      errcode = '22023',
      message = 'business_id, submission_id and submission_fingerprint are required';
  end if;

  v_submission_fingerprint :=
    lower(trim(p_submission_fingerprint));

  if v_submission_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'submission_fingerprint must be a SHA-256 hex digest';
  end if;

  v_customer_name := nullif(trim(coalesce(p_customer_name, '')), '');
  v_customer_phone := nullif(trim(coalesce(p_customer_phone, '')), '');
  v_customer_email := nullif(lower(trim(coalesce(p_customer_email, ''))), '');
  v_customer_city := nullif(trim(coalesce(p_customer_city, '')), '');

  if v_customer_name is null or v_customer_phone is null then
    raise exception using
      errcode = '22023',
      message = 'customer_name and customer_phone are required';
  end if;

  v_phone_normalized := nullif(
    regexp_replace(v_customer_phone, '[^0-9]', '', 'g'),
    ''
  );

  if v_phone_normalized is null then
    raise exception using
      errcode = '22023',
      message = 'customer_phone must contain digits';
  end if;

  v_email_normalized := v_customer_email;

  -- Serialize retries of the same submission.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_business_id::text || ':website-submission:' || p_submission_id::text,
      0
    )
  );

  -- Serialize customer identity resolution/creation.
  -- Acquire every identity lock in deterministic lexical order so requests
  -- sharing email/phone identifiers cannot deadlock through lock ordering.
  perform pg_advisory_xact_lock(lock_key)
    from (
      select distinct hashtextextended(identity_key, 0) as lock_key
        from (
          select p_business_id::text || ':customer-phone:' ||
                 v_phone_normalized as identity_key

          union all

          select p_business_id::text || ':customer-email:' ||
                 v_email_normalized
           where v_email_normalized is not null
        ) identity_keys
    ) locks
   order by lock_key;

  -- The lead idempotency key is the canonical submission ownership record.
  -- Lock it when present so concurrent retries serialize on the same result.
  select l.*
    into v_existing_lead
    from public.leads l
   where l.business_id = p_business_id
     and l.idempotency_key = p_submission_id
   for update;

  if found then
    if v_existing_lead.website_submission_fingerprint is null
       or v_existing_lead.website_submission_fingerprint
            is distinct from v_submission_fingerprint then
      raise exception using
        errcode = '22000',
        message = 'website submission replay payload does not match the committed submission';
    end if;

    select q.id
      into v_quote_id
      from public.quotes q
     where q.business_id = p_business_id
       and q.lead_id = v_existing_lead.id
       and q.idempotency_key = p_submission_id
     order by q.created_at, q.id
     limit 1;

    if v_existing_lead.customer_id is null
       or v_existing_lead.vehicle_id is null
       or v_quote_id is null then
      raise exception using
        errcode = '40001',
        message = 'website submission exists in an incomplete state';
    end if;

    return query
    select
      v_existing_lead.customer_id,
      v_existing_lead.vehicle_id,
      v_existing_lead.id,
      v_quote_id;

    return;
  end if;

  -- Resolve both canonical identifiers independently.
  if v_email_normalized is not null then
    select ci.customer_id
      into v_email_customer_id
      from public.customer_identifiers ci
     where ci.business_id = p_business_id
       and ci.identifier_type = 'email'
       and ci.normalized_value = v_email_normalized
     limit 1;
  end if;

  select ci.customer_id
    into v_phone_customer_id
    from public.customer_identifiers ci
   where ci.business_id = p_business_id
     and ci.identifier_type = 'phone'
     and ci.normalized_value = v_phone_normalized
   limit 1;

  if v_email_customer_id is not null
     and v_phone_customer_id is not null
     and v_email_customer_id <> v_phone_customer_id then
    raise exception using
      errcode = '23505',
      message = 'customer identifiers belong to different customers';
  end if;

  v_customer_id := coalesce(
    v_email_customer_id,
    v_phone_customer_id
  );

  if v_customer_id is null then
    insert into public.customers (
      business_id,
      full_name,
      email,
      phone,
      city,
      source,
      idempotency_key
    )
    values (
      p_business_id,
      v_customer_name,
      v_customer_email,
      v_phone_normalized,
      v_customer_city,
      coalesce(nullif(trim(p_source), ''), 'website'),
      p_submission_id
    )
    returning id into v_customer_id;

    if v_email_normalized is not null then
      insert into public.customer_identifiers (
        business_id,
        customer_id,
        identifier_type,
        identifier_value,
        normalized_value,
        source,
        is_primary
      )
      values (
        p_business_id,
        v_customer_id,
        'email',
        v_email_normalized,
        v_email_normalized,
        'website',
        true
      );
    end if;

    insert into public.customer_identifiers (
      business_id,
      customer_id,
      identifier_type,
      identifier_value,
      normalized_value,
      source,
      is_primary
    )
    values (
      p_business_id,
      v_customer_id,
      'phone',
      v_phone_normalized,
      v_phone_normalized,
      'website',
      true
    );
  end if;

  insert into public.vehicles (
    business_id,
    customer_id,
    brand,
    model,
    vehicle_type,
    color,
    plate,
    idempotency_key
  )
  values (
    p_business_id,
    v_customer_id,
    case
      when nullif(trim(coalesce(p_vehicle_name, '')), '') is null then null
      else split_part(trim(p_vehicle_name), ' ', 1)
    end,
    nullif(trim(coalesce(p_vehicle_name, '')), ''),
    nullif(trim(coalesce(p_vehicle_type, '')), ''),
    null,
    null,
    p_submission_id
  )
  returning id into v_vehicle_id;

  insert into public.leads (
    business_id,
    customer_id,
    vehicle_id,
    source,
    source_page,
    lifecycle_status,
    utm_source,
    utm_campaign,
    notes,
    idempotency_key,
    website_submission_fingerprint
  )
  values (
    p_business_id,
    v_customer_id,
    v_vehicle_id,
    coalesce(nullif(trim(p_source), ''), 'website'),
    coalesce(nullif(trim(p_source_page), ''), '/devis'),
    'NEW',
    nullif(trim(coalesce(p_utm_source, '')), ''),
    nullif(trim(coalesce(p_utm_campaign, '')), ''),
    nullif(trim(coalesce(p_customer_comment, '')), ''),
    p_submission_id,
    v_submission_fingerprint
  )
  returning id into v_lead_id;

  insert into public.lead_services (
    business_id,
    lead_id,
    service_name,
    service_slug,
    base_price,
    estimated_time,
    selected_options,
    premium_addons,
    customer_comment
  )
  values (
    p_business_id,
    v_lead_id,
    coalesce(nullif(trim(p_service_name), ''), 'Prestation'),
    nullif(trim(coalesce(p_service_slug, '')), ''),
    p_base_price,
    nullif(trim(coalesce(p_estimated_time, '')), ''),
    coalesce(p_selected_options, '[]'::jsonb),
    coalesce(
      (
        select jsonb_agg(addon ->> 'name')
          from jsonb_array_elements(
            coalesce(p_premium_addons, '[]'::jsonb)
          ) addon
         where nullif(trim(addon ->> 'name'), '') is not null
      ),
      '[]'::jsonb
    ),
    nullif(trim(coalesce(p_customer_comment, '')), '')
  );

  insert into public.quotes (
    business_id,
    lead_id,
    quote_version,
    total_price,
    estimated_time,
    status,
    payload_json,
    idempotency_key
  )
  values (
    p_business_id,
    v_lead_id,
    1,
    coalesce(p_total_price, 0),
    nullif(trim(coalesce(p_estimated_time, '')), ''),
    'DRAFT',
    jsonb_build_object(
      'customerName', v_customer_name,
      'customerPhone', v_customer_phone,
      'customerCity', v_customer_city,
      'serviceName', nullif(trim(coalesce(p_service_name, '')), ''),
      'vehicleName', nullif(trim(coalesce(p_vehicle_name, '')), ''),
      'selectedOptions', coalesce(p_selected_options, '[]'::jsonb),
      'selectedPremiumAddons', coalesce(p_premium_addons, '[]'::jsonb),
      'availabilityDateTime', nullif(trim(coalesce(p_availability_datetime, '')), '')
    ),
    p_submission_id
  )
  returning id into v_quote_id;

  -- Deliberately structural event data only. Customer PII already lives in
  -- the canonical customer record and must not be duplicated in activity_log.
  insert into public.activity_log (
    business_id,
    customer_id,
    lead_id,
    event_type,
    event_data
  )
  values (
    p_business_id,
    v_customer_id,
    v_lead_id,
    'website.lead.created',
    jsonb_build_object(
      'source', coalesce(nullif(trim(p_source), ''), 'website'),
      'quote_id', v_quote_id,
      'vehicle_id', v_vehicle_id
    )
  );

  return query
  select
    v_customer_id,
    v_vehicle_id,
    v_lead_id,
    v_quote_id;

end
$$;

revoke all on function public.create_website_quote_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  jsonb,
  jsonb,
  numeric,
  text
) from public, anon, authenticated;

grant execute on function public.create_website_quote_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  jsonb,
  jsonb,
  numeric,
  text
) to service_role;

commit;
