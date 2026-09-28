begin;

-- Main CRM service-label edit. No historical rows are rewritten.
-- A quote, job or appointment makes the service read-only in this first version.
-- The lead lock serializes this operation with canonical writers that lock
-- the parent lead; any other writers must obey the same business contract.
create function public.update_lead_service_details(
  p_business_id uuid,
  p_lead_id uuid,
  p_service_id uuid,
  p_expected_service_name text,
  p_expected_updated_at timestamptz,
  p_service_name text,
  p_source text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_lead public.leads%rowtype;
  v_service public.lead_services%rowtype;
  v_activity public.activity_log%rowtype;
  v_name text := btrim(p_service_name);
  v_source text := coalesce(nullif(btrim(p_source), ''), 'crm_pipeline_ui');
  v_old_name text;
begin
  if p_business_id is null
     or p_lead_id is null
     or p_service_id is null
     or p_expected_service_name is null
     or p_expected_updated_at is null
     or v_name is null
     or length(v_name) = 0
     or length(v_name) > 200
     or length(v_source) > 80
  then
    return jsonb_build_object('status', 'invalid');
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = p_lead_id
   for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select *
    into v_service
    from public.lead_services
   where business_id = p_business_id
     and lead_id = p_lead_id
     and id = p_service_id
   for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_service.service_name is distinct from p_expected_service_name
     or v_service.updated_at is distinct from p_expected_updated_at
  then
    return jsonb_build_object('status', 'conflict');
  end if;

  if v_lead.lifecycle_status not in ('NEW', 'QUALIFIED', 'CONTACTED')
     or exists (
       select 1 from public.quotes
        where business_id = p_business_id and lead_id = p_lead_id
     )
     or exists (
       select 1 from public.jobs
        where business_id = p_business_id and lead_id = p_lead_id
     )
     or exists (
       select 1 from public.appointments
        where business_id = p_business_id and lead_id = p_lead_id
     )
  then
    return jsonb_build_object('status', 'blocked');
  end if;

  if v_service.service_name = v_name then
    return jsonb_build_object(
      'status', 'no_op',
      'customer_id', v_lead.customer_id,
      'service', to_jsonb(v_service),
      'activity', null
    );
  end if;

  v_old_name := v_service.service_name;

  update public.lead_services
     set service_name = v_name,
         updated_at = now()
   where business_id = p_business_id
     and lead_id = p_lead_id
     and id = p_service_id
   returning * into v_service;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Service disappeared during locked update';
  end if;

  insert into public.activity_log (
    business_id, customer_id, lead_id, event_type, event_data
  )
  values (
    p_business_id,
    v_lead.customer_id,
    p_lead_id,
    'lead.service_updated',
    jsonb_build_object(
      'service_id', p_service_id,
      'previous_service_name', v_old_name,
      'new_service_name', v_name,
      'source', v_source
    )
  )
  returning * into v_activity;

  return jsonb_build_object(
    'status', 'updated',
    'customer_id', v_lead.customer_id,
    'service', to_jsonb(v_service),
    'activity', to_jsonb(v_activity)
  );
end;
$function$;

revoke all on function public.update_lead_service_details(
  uuid, uuid, uuid, text, timestamptz, text, text
) from public, anon, authenticated;

grant execute on function public.update_lead_service_details(
  uuid, uuid, uuid, text, timestamptz, text, text
) to service_role;

commit;
