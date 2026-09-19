begin;

-- Quote-Sent Lifecycle Invariant.
--
-- QUOTE_SENT is no longer a generic manual lead transition. A lead reaches
-- QUOTE_SENT only through the canonical quote-send operation, which advances
-- the quote DRAFT -> SENT and the lead CONTACTED -> QUOTE_SENT atomically in
-- a single transaction.
--
-- Lock order for mark_quote_as_sent is quote, then lead. This mirrors the
-- acceptance RPC (026) and the draft amount update RPC (030) and must never
-- be inverted.

create or replace function public.transition_lead_status(
  p_business_id uuid,
  p_lead_id uuid,
  p_target_status text,
  p_source text default 'internal'
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_lead public.leads%rowtype;
  v_activity public.activity_log%rowtype;
  v_target_status text := upper(trim(p_target_status));
  v_source text := coalesce(nullif(trim(p_source), ''), 'internal');
  v_previous_status text;
begin
  if p_business_id is null or p_lead_id is null then
    raise exception using
      errcode = '22023',
      message = 'business_id and lead_id are required';
  end if;

  if v_target_status is null
     or v_target_status not in (
       'NEW',
       'QUALIFIED',
       'CONTACTED',
       'QUOTE_SENT',
       'BOOKED',
       'IN_PROGRESS',
       'COMPLETED',
       'REVIEW_REQUESTED',
       'CLOSED_LOST'
     )
  then
    raise exception using
      errcode = '22023',
      message = format('Unsupported lead status: %s', p_target_status);
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = p_lead_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Lead not found for the requested business';
  end if;

  if v_lead.lifecycle_status = v_target_status then
    return jsonb_build_object(
      'lead', to_jsonb(v_lead),
      'activity', null
    );
  end if;

  if v_lead.lifecycle_status = 'NEW' then
    if v_target_status not in ('QUALIFIED', 'CLOSED_LOST') then
      raise exception using
        errcode = '23514',
        message = format('Invalid lead transition: %s -> %s', v_lead.lifecycle_status, v_target_status);
    end if;
  elsif v_lead.lifecycle_status = 'QUALIFIED' then
    if v_target_status not in ('CONTACTED', 'CLOSED_LOST') then
      raise exception using
        errcode = '23514',
        message = format('Invalid lead transition: %s -> %s', v_lead.lifecycle_status, v_target_status);
    end if;
  elsif v_lead.lifecycle_status = 'CONTACTED' then
    -- QUOTE_SENT is reachable only through the canonical quote-send
    -- operation (mark_quote_as_sent), never through a generic transition.
    if v_target_status <> 'CLOSED_LOST' then
      raise exception using
        errcode = '23514',
        message = format('Invalid lead transition: %s -> %s', v_lead.lifecycle_status, v_target_status);
    end if;
  elsif v_lead.lifecycle_status = 'QUOTE_SENT' then
    if v_target_status <> 'CLOSED_LOST' then
      raise exception using
        errcode = '23514',
        message = format('Invalid lead transition: %s -> %s', v_lead.lifecycle_status, v_target_status);
    end if;
  else
    raise exception using
      errcode = '23514',
      message = format('Lead status %s is not manually transitionable', v_lead.lifecycle_status);
  end if;

  v_previous_status := v_lead.lifecycle_status;

  update public.leads
     set lifecycle_status = v_target_status
   where business_id = p_business_id
     and id = v_lead.id
  returning * into v_lead;

  insert into public.activity_log (
    business_id,
    customer_id,
    lead_id,
    event_type,
    event_data
  ) values (
    p_business_id,
    v_lead.customer_id,
    v_lead.id,
    'lead.status_changed',
    jsonb_build_object(
      'source', v_source,
      'lead_id', v_lead.id,
      'previous_status', v_previous_status,
      'new_status', v_target_status
    )
  )
  returning * into v_activity;

  return jsonb_build_object(
    'lead', to_jsonb(v_lead),
    'activity', to_jsonb(v_activity)
  );
end;
$$;

create or replace function public.mark_quote_as_sent(
  p_business_id uuid,
  p_quote_id uuid,
  p_source text default 'internal'
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
  v_source text := coalesce(nullif(trim(p_source), ''), 'internal');
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

  if v_quote.status = 'SENT' then
    -- Canonical replay of a completed quote-send is a deterministic no-op
    -- only when the lead is in the corresponding canonical QUOTE_SENT state.
    -- A SENT quote whose lead is anywhere else is split-brain state and must
    -- be surfaced, never silently accepted.
    if v_lead.lifecycle_status is distinct from 'QUOTE_SENT' then
      raise exception using
        errcode = '23514',
        message = format('Sent quote lead is in incompatible status %s', v_lead.lifecycle_status);
    end if;

    return jsonb_build_object(
      'quote', to_jsonb(v_quote),
      'activity', null,
      'no_op', true
    );
  end if;

  if v_quote.status <> 'DRAFT' then
    raise exception using
      errcode = '23514',
      message = format('Quote status %s cannot be marked as sent', v_quote.status);
  end if;

  -- The canonical quote-send advances CONTACTED -> QUOTE_SENT. Any other
  -- lead lifecycle state is rejected; it is never rewritten or repaired.
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
      'source', v_source,
      'quote_id', v_quote.id
    )
  )
  returning * into v_activity;

  return jsonb_build_object(
    'quote', to_jsonb(v_quote),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$$;

revoke all on function public.transition_lead_status(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.transition_lead_status(uuid, uuid, text, text)
  to service_role;

revoke all on function public.mark_quote_as_sent(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.mark_quote_as_sent(uuid, uuid, text)
  to service_role;

commit;
