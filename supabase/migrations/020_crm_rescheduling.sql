create index if not exists idx_appointments_business_scheduled_at_id
  on public.appointments (business_id, scheduled_at, id)
  where scheduled_at is not null;

create or replace function public.reschedule_job(
  p_business_id uuid,
  p_job_id uuid,
  p_expected_scheduled_at timestamptz,
  p_scheduled_at_local text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_job public.jobs%rowtype;
  v_customer public.customers%rowtype;
  v_lead public.leads%rowtype;
  v_quote public.quotes%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_activity public.activity_log%rowtype;
  v_local timestamp without time zone;
  v_scheduled_at timestamptz;
  v_previous_scheduled_at timestamptz;
  v_candidate_count integer;
begin
  if p_business_id is null
     or p_job_id is null
     or p_expected_scheduled_at is null
     or p_scheduled_at_local is null
  then
    raise exception using
      errcode = '22023',
      message = 'business_id, job_id, expected_scheduled_at and scheduled_at are required';
  end if;

  if p_scheduled_at_local
     !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'
  then
    raise exception using
      errcode = '22023',
      message = 'scheduled_at has an invalid format';
  end if;

  begin
    v_local := p_scheduled_at_local::timestamp without time zone;
  exception when others then
    raise exception using
      errcode = '22023',
      message = 'scheduled_at is not a valid calendar time';
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
    raise exception using
      errcode = '22023',
      message = 'scheduled_at does not exist in Europe/Paris';
  elsif v_candidate_count > 1 then
    raise exception using
      errcode = '22023',
      message = 'scheduled_at is ambiguous in Europe/Paris';
  end if;

  /*
   * Lock order intentionally matches transition_appointment_status and the
   * existing-appointment path of schedule_job: appointment, then job.
   */
  select *
    into v_appointment
    from public.appointments
   where business_id = p_business_id
     and job_id = p_job_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Scheduled appointment not found for the requested business';
  end if;

  select *
    into v_job
    from public.jobs
   where business_id = p_business_id
     and id = p_job_id
   for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Appointment job does not belong to the requested business';
  end if;

  select *
    into v_customer
    from public.customers
   where business_id = p_business_id
     and id = v_job.customer_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Job customer does not belong to the requested business';
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = v_job.lead_id
     and customer_id = v_job.customer_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Job lead does not belong to the requested business and customer';
  end if;

  if v_job.quote_id is not null then
    select *
      into v_quote
      from public.quotes
     where business_id = p_business_id
       and id = v_job.quote_id
       and lead_id = v_job.lead_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'Job quote does not belong to the requested business and lead';
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
      raise exception using
        errcode = '23503',
        message = 'Job vehicle does not belong to the requested business and customer';
    end if;
  end if;

  if v_appointment.business_id is distinct from v_job.business_id
     or v_appointment.customer_id is distinct from v_job.customer_id
     or v_appointment.lead_id is distinct from v_job.lead_id
     or v_appointment.quote_id is distinct from v_job.quote_id
     or v_appointment.job_id is distinct from v_job.id
     or v_appointment.vehicle_id is distinct from v_job.vehicle_id
  then
    raise exception using
      errcode = '23514',
      message = 'Appointment relationships do not match the job';
  end if;

  if v_appointment.scheduled_at is null
     or v_job.scheduled_at is null
     or v_appointment.scheduled_at is distinct from v_job.scheduled_at
  then
    raise exception using
      errcode = '23514',
      message = 'Operational schedule projection is inconsistent';
  end if;

  if not (
    (
      v_appointment.status = 'REQUESTED'
      and v_job.status = 'SCHEDULED'
    )
    or (
      v_appointment.status = 'CONFIRMED'
      and v_job.status = 'CONFIRMED'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = format(
        'Appointment status %s and job status %s cannot be rescheduled',
        v_appointment.status,
        v_job.status
      );
  end if;

  /*
   * Same canonical instant is a replay/no-op, including after the instant
   * has passed. No timestamp, requested_at, status or activity is changed.
   */
  if v_appointment.scheduled_at = v_scheduled_at then
    return jsonb_build_object(
      'appointment', to_jsonb(v_appointment),
      'job', to_jsonb(v_job),
      'activity', null,
      'no_op', true
    );
  end if;

  /*
   * Optimistic concurrency check for a genuinely different target.
   * This prevents a stale form from overwriting a newer reschedule.
   */
  if v_appointment.scheduled_at is distinct from p_expected_scheduled_at then
    raise exception using
      errcode = '40001',
      message = 'Scheduled time changed since it was loaded';
  end if;

  if v_scheduled_at <= now() then
    raise exception using
      errcode = '22023',
      message = 'scheduled_at must be in the future';
  end if;

  v_previous_scheduled_at := v_appointment.scheduled_at;

  update public.appointments
     set scheduled_at = v_scheduled_at
   where business_id = p_business_id
     and id = v_appointment.id
     and status = v_appointment.status
     and scheduled_at = p_expected_scheduled_at
  returning * into v_appointment;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Appointment could not be rescheduled';
  end if;

  update public.jobs
     set scheduled_at = v_scheduled_at
   where business_id = p_business_id
     and id = v_job.id
     and status = v_job.status
     and scheduled_at = p_expected_scheduled_at
  returning * into v_job;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Job schedule projection could not be updated';
  end if;

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
    'appointment.rescheduled',
    jsonb_build_object(
      'source', 'crm_rescheduling_ui',
      'appointment_id', v_appointment.id,
      'job_id', v_job.id,
      'lead_id', v_job.lead_id,
      'previous_scheduled_at', v_previous_scheduled_at,
      'new_scheduled_at', v_scheduled_at
    )
  )
  returning * into v_activity;

  return jsonb_build_object(
    'appointment', to_jsonb(v_appointment),
    'job', to_jsonb(v_job),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$$;

revoke all on function public.reschedule_job(uuid, uuid, timestamptz, text)
  from public, anon, authenticated;

grant execute on function public.reschedule_job(uuid, uuid, timestamptz, text)
  to service_role;
