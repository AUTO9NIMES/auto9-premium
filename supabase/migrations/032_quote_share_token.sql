begin;

-- Public Quote Share Token.
--
-- Turns a CRM quote into a secure customer-facing artifact behind an opaque,
-- high-entropy share token. Only the SHA-256 hash of the token is persisted;
-- the raw token is returned exactly once at issuance and never stored.
--
-- Issuing a token for a DRAFT quote atomically performs the canonical 031
-- transition (quote DRAFT -> SENT, lead CONTACTED -> QUOTE_SENT, one
-- quote.sent activity) and generates the token in the same transaction.
-- Issuance and transition are never separate steps.
--
-- Public acceptance resolves the token server-side and delegates to the
-- canonical 026 acceptance RPC, preserving its lock order, guards, replay,
-- and activity semantics. No acceptance logic is duplicated.

alter table public.quotes
  add column if not exists share_token_hash text;

alter table public.quotes
  drop constraint if exists chk_quotes_share_token_hash;

alter table public.quotes
  add constraint chk_quotes_share_token_hash
  check (
    share_token_hash is null
    or share_token_hash ~ '^[0-9a-f]{64}$'
  );

create unique index if not exists ux_quotes_business_share_token_hash
  on public.quotes (business_id, share_token_hash)
  where share_token_hash is not null;

-- ---------------------------------------------------------------------------
-- Issuance: create/rotate the share token.
-- DRAFT  -> atomically transition to SENT (031 semantics) + issue token.
-- SENT   -> coherent QUOTE_SENT lead required; rotate token only.
-- Terminal (ACCEPTED/REJECTED/EXPIRED) -> reject (V1: no terminal reshare).
-- Lock order is quote, then lead. Never the reverse.
-- ---------------------------------------------------------------------------

create or replace function public.issue_quote_share_token(
  p_business_id uuid,
  p_quote_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_quote public.quotes%rowtype;
  v_lead public.leads%rowtype;
  v_activity public.activity_log%rowtype;
  v_raw_token text;
  v_token_hash text;
  v_did_transition boolean := false;
begin
  if p_business_id is null or p_quote_id is null then
    raise exception using errcode = '22023', message = 'business_id and quote_id are required';
  end if;

  -- Quote first, then lead. Never the reverse.
  select *
    into v_quote
    from public.quotes
   where business_id = p_business_id
     and id = p_quote_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Quote not found for the requested business';
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = v_quote.lead_id
   for update;

  if not found then
    raise exception using errcode = '23503', message = 'Quote lead does not belong to the requested business';
  end if;

  if v_quote.status = 'DRAFT' then
    -- Reproduce the effective 031 transition exactly: a DRAFT quote may only
    -- be shared from a CONTACTED lead, advancing it to QUOTE_SENT.
    if v_lead.lifecycle_status <> 'CONTACTED' then
      raise exception using
        errcode = '23514',
        message = format('Lead status %s cannot be marked as quote sent', v_lead.lifecycle_status);
    end if;

    update public.quotes
       set status = 'SENT'
     where business_id = p_business_id
       and id = p_quote_id
       and status = 'DRAFT'
    returning * into v_quote;

    if not found then
      raise exception using errcode = '40001', message = 'Quote could not be marked as sent';
    end if;

    update public.leads
       set lifecycle_status = 'QUOTE_SENT'
     where business_id = p_business_id
       and id = v_lead.id
       and lifecycle_status = 'CONTACTED'
    returning * into v_lead;

    if not found then
      raise exception using errcode = '40001', message = 'Lead could not be marked as quote sent';
    end if;

    -- quote.sent activity exactly once, mirroring 031.
    insert into public.activity_log (
      business_id,
      lead_id,
      event_type,
      event_data
    ) values (
      p_business_id,
      v_quote.lead_id,
      'quote.sent',
      jsonb_build_object(
        'source', 'crm_quote_share_ui',
        'quote_id', v_quote.id
      )
    )
    returning * into v_activity;

    v_did_transition := true;
  elsif v_quote.status = 'SENT' then
    -- Reshare of an already-sent quote. The lead must be in the coherent
    -- canonical state; do not repeat the transition or its activity, and do
    -- not repair unrelated incoherent states silently.
    if v_lead.lifecycle_status is distinct from 'QUOTE_SENT' then
      raise exception using
        errcode = '23514',
        message = format('Sent quote lead is in incompatible status %s', v_lead.lifecycle_status);
    end if;
  else
    -- ACCEPTED / REJECTED / EXPIRED: no new share issuance in V1.
    raise exception using
      errcode = '23514',
      message = format('Quote status %s cannot be shared', v_quote.status);
  end if;

  -- 128 random bits; raw token is lowercase hex (32 chars). Only its
  -- SHA-256 hex hash is persisted. The raw token is returned once and never
  -- stored, logged, or written to activity/payload.
  v_raw_token := encode(gen_random_bytes(16), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  update public.quotes
     set share_token_hash = v_token_hash
   where business_id = p_business_id
     and id = v_quote.id
  returning * into v_quote;

  if not found then
    raise exception using errcode = '40001', message = 'Quote share token could not be issued';
  end if;

  return jsonb_build_object(
    'quote', to_jsonb(v_quote),
    'lead', to_jsonb(v_lead),
    'token', v_raw_token,
    'activity', case when v_did_transition then to_jsonb(v_activity) else null end,
    'transitioned', v_did_transition
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public read: resolve a quote by its share token.
-- Server-only (service_role); the browser token is the sole capability.
-- DRAFT and unknown/rotated tokens return a generic not-found (no leak).
-- ---------------------------------------------------------------------------

create or replace function public.get_public_quote_by_token(
  p_token text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_token_hash text;
  v_quote public.quotes%rowtype;
  v_lead public.leads%rowtype;
  v_customer public.customers%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_business public.businesses%rowtype;
  v_service_names text[];
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    raise exception using errcode = '22023', message = 'token is invalid';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select *
    into v_quote
    from public.quotes
   where share_token_hash = v_token_hash;

  -- DRAFT is never publicly readable; unknown/rotated hashes are not found.
  if not found or v_quote.status = 'DRAFT' then
    raise exception using errcode = 'P0002', message = 'Quote not found';
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = v_quote.business_id
     and id = v_quote.lead_id;

  if not found then
    raise exception using errcode = '23503', message = 'Quote lead is inconsistent';
  end if;

  select *
    into v_customer
    from public.customers
   where business_id = v_quote.business_id
     and id = v_lead.customer_id;

  if not found then
    raise exception using errcode = '23503', message = 'Quote customer is inconsistent';
  end if;

  select *
    into v_business
    from public.businesses
   where id = v_quote.business_id;

  if not found then
    raise exception using errcode = '23503', message = 'Quote business is inconsistent';
  end if;

  if v_lead.vehicle_id is not null then
    select *
      into v_vehicle
      from public.vehicles
     where business_id = v_quote.business_id
       and customer_id = v_lead.customer_id
       and id = v_lead.vehicle_id;
  end if;

  select coalesce(array_agg(ls.service_name order by ls.created_at, ls.id), '{}'::text[])
    into v_service_names
    from public.lead_services ls
   where ls.business_id = v_quote.business_id
     and ls.lead_id = v_lead.id;

  -- Minimal customer-facing projection. No internal UUIDs, no payload_json,
  -- no contact PII, no tenant metadata.
  return jsonb_build_object(
    'business_name', v_business.name,
    'customer_name', nullif(trim(concat_ws(' ', v_customer.first_name, v_customer.last_name)), ''),
    'customer_full_name_fallback', v_customer.full_name,
    'vehicle_name', case
      when v_vehicle.id is null then null
      else nullif(trim(concat_ws(' ', v_vehicle.brand, v_vehicle.model, v_vehicle.variant)), '')
    end,
    'service_names', to_jsonb(v_service_names),
    'total_price', v_quote.total_price,
    'estimated_time', v_quote.estimated_time,
    'status', v_quote.status,
    'created_at', v_quote.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public acceptance: resolve token -> quote/business server-side, require
-- SENT for first acceptance, then delegate to the canonical 026 acceptance
-- RPC so its lock order, guards, replay and activity are preserved exactly.
-- ---------------------------------------------------------------------------

create or replace function public.accept_public_quote_by_token(
  p_token text,
  p_source text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_token_hash text;
  v_quote public.quotes%rowtype;
  v_source text := coalesce(nullif(trim(p_source), ''), 'public_quote_share');
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    raise exception using errcode = '22023', message = 'token is invalid';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select *
    into v_quote
    from public.quotes
   where share_token_hash = v_token_hash;

  -- Unknown/rotated token: generic not-found, no existence leak.
  if not found then
    raise exception using errcode = 'P0002', message = 'Quote not found';
  end if;

  -- First acceptance requires SENT. DRAFT/REJECTED/EXPIRED are rejected.
  -- An already-ACCEPTED quote is delegated to the canonical RPC, which
  -- returns its deterministic replay/no-op (no second job, no duplicate
  -- activity).
  if v_quote.status = 'DRAFT' then
    raise exception using errcode = '23514', message = 'Quote is not available';
  end if;

  if v_quote.status in ('REJECTED', 'EXPIRED') then
    raise exception using errcode = '23514', message = 'Quote is no longer available';
  end if;

  -- Delegate to the canonical acceptance primitive (026) in the same
  -- transaction. Token resolved the tenant internally; the browser never
  -- supplies business_id.
  return public.accept_quote_and_create_job(
    v_quote.business_id,
    v_quote.id,
    v_source
  );
end;
$$;

revoke all on function public.issue_quote_share_token(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.issue_quote_share_token(uuid, uuid)
  to service_role;

revoke all on function public.get_public_quote_by_token(text)
  from public, anon, authenticated;
grant execute on function public.get_public_quote_by_token(text)
  to service_role;

revoke all on function public.accept_public_quote_by_token(text, text)
  from public, anon, authenticated;
grant execute on function public.accept_public_quote_by_token(text, text)
  to service_role;

commit;
