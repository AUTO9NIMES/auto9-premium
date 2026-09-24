begin;

-- Required arguments keep these overloads unambiguous for PostgREST. Existing
-- signatures remain available unchanged to older callers. No historical rows
-- are rewritten by this migration.
create or replace function public.update_customer_profile(
  p_business_id uuid,
  p_customer_id uuid,
  p_full_name text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_source text,
  p_birth_date date,
  p_birth_date_provided boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_birth_date date;
begin
  if p_birth_date_provided is null then
    raise exception using errcode = '22023', message = 'birth_date_provided is required';
  end if;

  -- Preserve omitted birth dates while holding the same customer lock used by
  -- the canonical updater. An explicit NULL continues to mean clear the field.
  select birth_date into v_birth_date
    from public.customers
   where business_id = p_business_id and id = p_customer_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Customer not found for the requested business';
  end if;

  return public.update_customer_profile(
    p_business_id, p_customer_id, p_full_name, p_first_name, p_last_name,
    p_email, p_phone, p_city, p_source,
    case when p_birth_date_provided then p_birth_date else v_birth_date end
  );
end;
$function$;

revoke all on function public.update_customer_profile(uuid, uuid, text, text, text, text, text, text, text, date, boolean) from public, anon, authenticated;
grant execute on function public.update_customer_profile(uuid, uuid, text, text, text, text, text, text, text, date, boolean) to service_role;

create or replace function public.transition_lead_status(
  p_business_id uuid,
  p_lead_id uuid,
  p_target_status text,
  p_source text,
  p_comment text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_result jsonb;
  v_activity public.activity_log%rowtype;
  v_comment text := nullif(trim(p_comment), '');
begin
  if length(v_comment) > 1000 then
    raise exception using errcode = '22023', message = 'Cancellation comment is too long';
  end if;

  -- Delegate ALL lifecycle, tenant, locking and no-op decisions to the existing
  -- canonical four-argument RPC. Its row locks last until this call commits.
  v_result := public.transition_lead_status(
    p_business_id, p_lead_id, p_target_status, p_source
  );

  -- Enrich only the event just created by this transition, in the SAME
  -- transaction. Replays have activity=null and never change existing history.
  if v_result->'lead'->>'lifecycle_status' = 'CLOSED_LOST'
     and v_result->'activity'->>'id' is not null
     and v_comment is not null then
    update public.activity_log
       set event_data = event_data || jsonb_build_object('comment', v_comment)
     where business_id = p_business_id
       and lead_id = p_lead_id
       and id = (v_result->'activity'->>'id')::uuid
       and event_type = 'lead.status_changed'
     returning * into v_activity;

    if not found then
      raise exception using errcode = '40001', message = 'Canonical transition activity is missing';
    end if;

    v_result := jsonb_set(v_result, '{activity}', to_jsonb(v_activity));
  end if;

  return v_result;
end;
$function$;

revoke all on function public.transition_lead_status(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.transition_lead_status(uuid, uuid, text, text, text) to service_role;

commit;
