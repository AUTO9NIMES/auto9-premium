begin;

-- Restore 031's manual transition matrix after 20260925000100. Quote sending
-- remains owned by mark_quote_as_sent / issue_quote_share_token. Replace only
-- the four-argument signature: the five-argument comment wrapper still delegates
-- here and enriches the same newly created event in the same transaction.
-- Operational cancellation is deliberately unsupported. BOOKED, IN_PROGRESS,
-- COMPLETED and REVIEW_REQUESTED cannot transition to CLOSED_LOST. Historical
-- CLOSED_LOST replay remains a no-op, not a repair of past inconsistent records.
-- V2 calendar entries, quotes, payments and operational history are untouched.

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

  -- This lead-only operation cannot cancel operational work. Fail closed for
  -- ANY linked job/appointment state, including CANCELLED, COMPLETED and PAID.
  -- A prospect label is not evidence that the linked work is still a prospect.
  -- Read existence under the lead lock; do not acquire child locks in the
  -- reverse order of appointment/job/review RPCs. No child state is rewritten.
  if v_target_status = 'CLOSED_LOST' then
    if exists (
      select 1 from public.jobs
       where business_id = p_business_id and lead_id = v_lead.id
    ) or exists (
      select 1 from public.appointments
       where business_id = p_business_id and lead_id = v_lead.id
    ) then
      raise exception using
        errcode = '23514',
        message = 'Lead with operational history cannot be closed by a lead-only transition';
    end if;
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

revoke all on function public.transition_lead_status(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.transition_lead_status(uuid, uuid, text, text)
  to service_role;

commit;
