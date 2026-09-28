begin;

-- Additive CRM V2 dossier edit using nullable business performance_date.
-- Historical RPC remains unchanged.
-- leads.created_at is an immutable technical timestamp.
-- No financial, lifecycle, quote, job or appointment writes.
create function public.update_v2_dossier_business_date(
  p_business_id uuid,
  p_lead_id uuid,
  p_expected_lead_updated_at timestamptz,
  p_expected_customer_updated_at timestamptz,
  p_expected_created_at timestamptz,
  p_expected_performance_date date,
  p_expected_service_id uuid,
  p_expected_service_updated_at timestamptz,
  p_expected_service_name text,
  p_full_name text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_service_name text,
  p_note text,
  p_performance_date date
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_lead public.leads%rowtype;
  v_customer public.customers%rowtype;
  v_service public.lead_services%rowtype;
  v_profile jsonb;
  v_activity public.activity_log%rowtype;
  v_service_name text := nullif(btrim(p_service_name), '');
  v_note text := nullif(btrim(p_note), '');
  v_service_changed boolean;
  v_date_changed boolean;
  v_note_changed boolean;
  v_engaged boolean;
begin
  if p_business_id is null
     or p_lead_id is null
     or p_expected_lead_updated_at is null
     or p_expected_customer_updated_at is null
     or p_expected_created_at is null
     or length(v_service_name) > 200
     or length(coalesce(v_note, '')) > 2000
     or (p_expected_service_id is null and
         (p_expected_service_updated_at is not null or
          p_expected_service_name is not null))
     or (p_expected_service_id is not null and
         (p_expected_service_updated_at is null or
          p_expected_service_name is null))
  then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_lead
    from public.leads
   where business_id = p_business_id
     and id = p_lead_id
   for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_lead.updated_at is distinct from p_expected_lead_updated_at
     or v_lead.created_at is distinct from p_expected_created_at
     or v_lead.performance_date is distinct from p_expected_performance_date
  then
    return jsonb_build_object('status', 'conflict');
  end if;

  -- Closed dossiers cannot be edited, including their shared customer profile.
  if v_lead.lifecycle_status = 'CLOSED_LOST' then
    return jsonb_build_object('status', 'blocked');
  end if;

  if p_expected_service_id is not null then
    select * into v_service
      from public.lead_services
     where business_id = p_business_id
       and lead_id = p_lead_id
       and id = p_expected_service_id
     for update;

    if not found then
      return jsonb_build_object('status', 'conflict');
    end if;

    if v_service.updated_at is distinct from p_expected_service_updated_at
       or v_service.service_name is distinct from p_expected_service_name
    then
      return jsonb_build_object('status', 'conflict');
    end if;
  end if;

  -- Reject stale selection when another service has become the latest.
  if exists (
    select 1 from public.lead_services s
     where s.business_id = p_business_id
       and s.lead_id = p_lead_id
       and (
         p_expected_service_id is null
         or (s.created_at, s.id) >
            (v_service.created_at, v_service.id)
       )
  ) then
    return jsonb_build_object('status', 'conflict');
  end if;

  v_date_changed := v_lead.performance_date is distinct from p_performance_date;
  v_note_changed := v_lead.notes is distinct from v_note;

  v_engaged :=
    v_lead.lifecycle_status not in ('NEW', 'QUALIFIED', 'CONTACTED')
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
    );

  -- An absent service is a creation only before commercial engagement.
  -- Legacy engaged dossiers without a service may still edit customer data
  -- and lead notes, but must not create a new service or change their date.
  -- A legacy engaged dossier without a service submits no service label.
  -- Reject a nonempty label instead of silently ignoring an attempted edit.
  if p_expected_service_id is null and v_engaged then
    if v_service_name is not null then
      return jsonb_build_object('status', 'blocked');
    end if;
  elsif v_service_name is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  v_service_changed :=
    case
      when p_expected_service_id is null then not v_engaged
      else v_service.service_name is distinct from v_service_name
    end;

  if v_engaged and (v_service_changed or v_date_changed) then
    return jsonb_build_object('status', 'blocked');
  end if;

  -- Lock the shared customer before canonical profile modification.
  select * into v_customer
    from public.customers
   where business_id = p_business_id
     and id = v_lead.customer_id
   for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_customer.updated_at is distinct from p_expected_customer_updated_at then
    return jsonb_build_object('status', 'conflict');
  end if;

  -- Preserve omitted birth date and reuse canonical identity checks.
  -- This call executes inside the SAME PostgreSQL transaction.
  v_profile := public.update_customer_profile(
    p_business_id,
    v_lead.customer_id,
    p_full_name,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    p_city,
    'crm_v2_dossier_ui',
    null::date,
    false
  );

  if v_profile->'customer'->>'id' is distinct from
     v_lead.customer_id::text then
    raise exception 'Canonical profile returned inconsistent ownership';
  end if;

  if v_service_changed then
    if p_expected_service_id is null then
      insert into public.lead_services (
        business_id, lead_id, service_name, customer_comment
      ) values (
        p_business_id, p_lead_id, v_service_name, v_note
      )
      returning * into v_service;
    else
      update public.lead_services
         set service_name = v_service_name,
             customer_comment = v_note
       where business_id = p_business_id
         and lead_id = p_lead_id
         and id = p_expected_service_id
      returning * into v_service;
    end if;
  elsif not v_engaged
        and v_note_changed
        and v_service.customer_comment is distinct from v_note then
    update public.lead_services
       set customer_comment = v_note
     where business_id = p_business_id
       and lead_id = p_lead_id
       and id = v_service.id
    returning * into v_service;
  end if;

  if v_note_changed or v_date_changed then
    update public.leads
       set notes = v_note,
           performance_date = p_performance_date
     where business_id = p_business_id
       and id = p_lead_id
    returning * into v_lead;
  end if;

  if v_service_changed then
    insert into public.activity_log (
      business_id, customer_id, lead_id, event_type, event_data
    ) values (
      p_business_id, v_lead.customer_id, p_lead_id,
      'lead.service_updated',
      jsonb_build_object(
        'source', 'crm_v2',
        'service_id', v_service.id,
        'previous_service_name', p_expected_service_name,
        'new_service_name', v_service_name
      )
    );
  end if;

  if v_date_changed then
    insert into public.activity_log (
      business_id, customer_id, lead_id, event_type, event_data
    ) values (
      p_business_id, v_lead.customer_id, p_lead_id,
      'crm_v2.dossier.date_adjusted',
      jsonb_build_object(
        'source', 'crm_v2_pipeline',
        'previous_performance_date', p_expected_performance_date,
        'new_performance_date', p_performance_date
      )
    );
  end if;

  if v_service_changed or v_note_changed or v_date_changed then
    insert into public.activity_log (
      business_id, customer_id, lead_id, event_type, event_data
    ) values (
      p_business_id,
      v_lead.customer_id,
      p_lead_id,
      'lead.details_updated',
      jsonb_build_object(
        'source', 'crm_v2',
        'service_id', v_service.id,
        'previous_service_name', p_expected_service_name,
        'new_service_name', v_service_name,
        'service_changed', v_service_changed,
        'note_changed', v_note_changed,
        'date_changed', v_date_changed,
        'previous_performance_date', p_expected_performance_date,
        'new_performance_date', p_performance_date
      )
    )
    returning * into v_activity;
  end if;

  return jsonb_build_object(
    'status', case
      when v_service_changed or v_note_changed or v_date_changed
        or v_profile->>'no_op' = 'false'
      then 'updated'
      else 'no_op'
    end,
    'customer_id', v_lead.customer_id,
    'lead', to_jsonb(v_lead),
    'service', case when v_service.id is null then null else to_jsonb(v_service) end,
    'profile', v_profile,
    'activity', case
      when v_activity.id is null then null
      else to_jsonb(v_activity)
    end
  );
end;
$function$;

revoke all on function public.update_v2_dossier_business_date(
  uuid, uuid, timestamptz, timestamptz, timestamptz, date, uuid, timestamptz,
  text, text, text, text, text, text, text, text, text, date
) from public, anon, authenticated;

grant execute on function public.update_v2_dossier_business_date(
  uuid, uuid, timestamptz, timestamptz, timestamptz, date, uuid, timestamptz,
  text, text, text, text, text, text, text, text, text, date
) to service_role;

commit;
