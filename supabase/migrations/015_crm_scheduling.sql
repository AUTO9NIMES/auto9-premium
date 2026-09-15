alter table public.appointments
  add column if not exists scheduled_at timestamptz;

create or replace function public.schedule_job(
  p_business_id uuid,
  p_job_id uuid,
  p_scheduled_at_local text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_job public.jobs%rowtype;
  v_appointment public.appointments%rowtype;
  v_customer public.customers%rowtype;
  v_lead public.leads%rowtype;
  v_quote public.quotes%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_activity public.activity_log%rowtype;
  v_local timestamp without time zone;
  v_scheduled_at timestamptz;
  v_now timestamptz := now();
  v_candidate_count integer;
  v_has_appointment boolean := false;
  v_job_found boolean := false;
begin
  if p_business_id is null or p_job_id is null or p_scheduled_at_local is null then
    raise exception using errcode = '22023', message = 'business_id, job_id and scheduled_at are required';
  end if;

  if p_scheduled_at_local !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then
    raise exception using errcode = '22023', message = 'scheduled_at has an invalid format';
  end if;

  begin
    v_local := p_scheduled_at_local::timestamp without time zone;
  exception when others then
    raise exception using errcode = '22023', message = 'scheduled_at is not a valid calendar time';
  end;

  select
    count(*)::integer,
    min(candidate)
    into v_candidate_count, v_scheduled_at
    from generate_series(
      (v_local - interval '3 hours') at time zone 'Europe/Paris',
      (v_local + interval '3 hours') at time zone 'Europe/Paris',
      interval '1 minute'
    ) as candidates(candidate)
   where candidates.candidate at time zone 'Europe/Paris' = v_local;

  if v_candidate_count = 0 then
    raise exception using errcode = '22023', message = 'scheduled_at does not exist in Europe/Paris';
  elsif v_candidate_count > 1 then
    raise exception using errcode = '22023', message = 'scheduled_at is ambiguous in Europe/Paris';
  end if;

  if v_scheduled_at <= v_now then
    raise exception using errcode = '22023', message = 'scheduled_at must be in the future';
  end if;

  select *
    into v_appointment
    from public.appointments
   where business_id = p_business_id
     and job_id = p_job_id
   for update;

  v_has_appointment := found;

  if v_has_appointment then
    select *
      into v_job
      from public.jobs
     where business_id = p_business_id
       and id = p_job_id
     for update;

     v_job_found := found;
  else
    select *
      into v_job
      from public.jobs
     where business_id = p_business_id
       and id = p_job_id
     for update;

    v_job_found := found;

    if not v_job_found then
      raise exception using errcode = 'P0002', message = 'Job not found for the requested business';
    end if;

    select *
      into v_appointment
      from public.appointments
     where business_id = p_business_id
       and job_id = p_job_id
     for update;

    v_has_appointment := found;
  end if;

  if not v_job_found then
    raise exception using errcode = 'P0002', message = 'Job not found for the requested business';
  end if;

  select *
    into v_customer
    from public.customers
   where business_id = p_business_id
     and id = v_job.customer_id;

  if not found then
    raise exception using errcode = '23503', message = 'Job customer does not belong to the requested business';
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = v_job.lead_id
     and customer_id = v_job.customer_id;

  if not found then
    raise exception using errcode = '23503', message = 'Job lead does not belong to the requested business and customer';
  end if;

  if v_job.quote_id is not null then
    select *
      into v_quote
      from public.quotes
     where business_id = p_business_id
       and id = v_job.quote_id
       and lead_id = v_job.lead_id;

    if not found then
      raise exception using errcode = '23503', message = 'Job quote does not belong to the requested business and lead';
    end if;
  end if;

  if v_job.vehicle_id is not null then
    select *
      into v_vehicle
      from public.vehicles
     where business_id = p_business_id
       and customer_id = v_job.customer_id
       and id = v_job.vehicle_id;

    if not found then
      raise exception using errcode = '23503', message = 'Job vehicle does not belong to the requested business and customer';
    end if;
  end if;

  if v_has_appointment then
    if v_appointment.business_id is distinct from v_job.business_id
       or v_appointment.customer_id is distinct from v_job.customer_id
       or v_appointment.lead_id is distinct from v_job.lead_id
       or v_appointment.quote_id is distinct from v_job.quote_id
       or v_appointment.job_id is distinct from v_job.id
       or v_appointment.vehicle_id is distinct from v_job.vehicle_id
    then
      raise exception using errcode = '23514', message = 'Appointment relationships do not match the job';
    end if;
  end if;

  if v_job.status = 'QUOTE_ACCEPTED' then
    if v_job.scheduled_at is not null then
      raise exception using errcode = '23514', message = 'Job scheduling state is inconsistent';
    end if;

    if v_has_appointment then
      if v_appointment.status <> 'REQUESTED' or v_appointment.scheduled_at is not null then
        raise exception using errcode = '23514', message = 'Appointment scheduling state is inconsistent';
      end if;
    end if;
  elsif v_job.status = 'SCHEDULED' then
    if not v_has_appointment
       or v_appointment.status <> 'REQUESTED'
       or v_appointment.scheduled_at is null
       or v_job.scheduled_at is null
       or v_appointment.scheduled_at is distinct from v_job.scheduled_at
    then
      raise exception using errcode = '23514', message = 'Job scheduling state is inconsistent';
    end if;

    if v_appointment.scheduled_at is distinct from v_scheduled_at then
      raise exception using errcode = '23514', message = 'Job is already scheduled for another time';
    end if;

    return jsonb_build_object(
      'appointment', to_jsonb(v_appointment),
      'job', to_jsonb(v_job),
      'activity', null,
      'no_op', true
    );
  else
    raise exception using errcode = '23514', message = format('Job status %s cannot be scheduled', v_job.status);
  end if;

  if v_has_appointment then
    update public.appointments
       set scheduled_at = v_scheduled_at
     where business_id = p_business_id
       and id = v_appointment.id
    returning * into v_appointment;
  else
    insert into public.appointments (
      business_id,
      customer_id,
      lead_id,
      quote_id,
      job_id,
      vehicle_id,
      status,
      requested_at,
      scheduled_at,
      notes
    ) values (
      v_job.business_id,
      v_job.customer_id,
      v_job.lead_id,
      v_job.quote_id,
      v_job.id,
      v_job.vehicle_id,
      'REQUESTED',
      v_now,
      v_scheduled_at,
      null
    )
    returning * into v_appointment;

  end if;

  update public.jobs
     set scheduled_at = v_scheduled_at,
         status = 'SCHEDULED'
   where business_id = p_business_id
     and id = v_job.id
  returning * into v_job;

  insert into public.activity_log (
    business_id,
    customer_id,
    lead_id,
    job_id,
    event_type,
    event_data
  ) values (
    p_business_id,
    v_job.customer_id,
    v_job.lead_id,
    v_job.id,
    'appointment.scheduled',
    jsonb_build_object(
      'source', 'crm_scheduling_ui',
      'appointment_id', v_appointment.id,
      'job_id', v_job.id,
      'lead_id', v_job.lead_id,
      'quote_id', v_job.quote_id
    )
  ) returning * into v_activity;

  return jsonb_build_object(
    'appointment', to_jsonb(v_appointment),
    'job', to_jsonb(v_job),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$$;

revoke all on function public.schedule_job(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.schedule_job(uuid, uuid, text)
  to service_role;
