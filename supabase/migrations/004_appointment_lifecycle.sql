create or replace function public.transition_appointment_status(
  p_business_id uuid,
  p_appointment_id uuid,
  p_target_status text,
  p_source text,
  p_notes text default null
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
  v_target_status text := upper(trim(p_target_status));
  v_source text := coalesce(nullif(trim(p_source), ''), 'internal');
  v_previous_status text;
  v_now timestamptz := now();
  v_is_idempotent boolean := false;
begin
  if p_business_id is null or p_appointment_id is null then
    raise exception using
      errcode = '22023',
      message = 'business_id and appointment_id are required';
  end if;

  if v_target_status is null
     or v_target_status not in ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')
  then
    raise exception using
      errcode = '22023',
      message = format('Unsupported appointment status: %s', p_target_status);
  end if;

  select *
    into v_appointment
    from public.appointments
   where business_id = p_business_id
     and id = p_appointment_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Appointment not found for the requested business';
  end if;

  select *
    into v_job
    from public.jobs
   where business_id = p_business_id
     and id = v_appointment.job_id
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
     and id = v_appointment.customer_id;

  if not found or v_job.customer_id is distinct from v_customer.id then
    raise exception using
      errcode = '23514',
      message = 'Appointment customer does not match the job';
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
      message = 'Appointment job lead does not belong to the requested business and customer';
  end if;

  if v_appointment.lead_id is not null
     and v_appointment.lead_id is distinct from v_lead.id
  then
    raise exception using
      errcode = '23514',
      message = 'Appointment lead does not match the job';
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
        message = 'Appointment job quote does not belong to the requested business and lead';
    end if;
  end if;

  if v_appointment.quote_id is not null then
    if v_job.quote_id is null
       or v_appointment.quote_id is distinct from v_job.quote_id
    then
      raise exception using
        errcode = '23514',
        message = 'Appointment quote does not match the job';
    end if;
  end if;

  if v_appointment.vehicle_id is not null then
    select *
      into v_vehicle
      from public.vehicles
     where business_id = p_business_id
       and customer_id = v_job.customer_id
       and id = v_appointment.vehicle_id;

    if not found or v_job.vehicle_id is distinct from v_vehicle.id then
      raise exception using
        errcode = '23514',
        message = 'Appointment vehicle does not match the job';
    end if;
  elsif v_job.vehicle_id is not null then
    raise exception using
      errcode = '23514',
      message = 'Appointment vehicle is missing while the job has a vehicle';
  end if;

  v_is_idempotent := v_appointment.status = v_target_status;

  if v_is_idempotent then
    null;
  elsif v_appointment.status = 'REQUESTED' then
    if v_target_status not in ('CONFIRMED', 'CANCELLED') then
      raise exception using
        errcode = '23514',
        message = format('Invalid appointment transition: %s -> %s', v_appointment.status, v_target_status);
    end if;
  elsif v_appointment.status = 'CONFIRMED' then
    if v_target_status not in ('COMPLETED', 'CANCELLED') then
      raise exception using
        errcode = '23514',
        message = format('Invalid appointment transition: %s -> %s', v_appointment.status, v_target_status);
    end if;
  elsif v_appointment.status in ('COMPLETED', 'CANCELLED') then
    raise exception using
      errcode = '23514',
      message = format('Appointment status %s is terminal', v_appointment.status);
  end if;

  if v_target_status = 'CONFIRMED' then
    if v_job.status in ('COMPLETED', 'CANCELLED', 'PAID', 'IN_PROGRESS') then
      raise exception using
        errcode = '23514',
        message = format('Job status %s cannot be synchronized to CONFIRMED', v_job.status);
    end if;

    if v_job.status <> 'CONFIRMED' then
      update public.jobs
         set status = 'CONFIRMED'
       where business_id = p_business_id
         and id = v_job.id
      returning * into v_job;
    end if;
  elsif v_target_status = 'COMPLETED' then
    if v_job.status not in ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'PAID') then
      raise exception using
        errcode = '23514',
        message = format('Job status %s cannot be synchronized to COMPLETED', v_job.status);
    end if;

    if v_is_idempotent
       and v_job.status = 'COMPLETED'
       and v_job.completed_at is null
    then
      raise exception using
        errcode = '23514',
        message = 'Completed job is missing completed_at';
    end if;

    if v_job.status not in ('COMPLETED', 'PAID') then
      update public.jobs
         set status = 'COMPLETED',
             completed_at = v_now
       where business_id = p_business_id
         and id = v_job.id
      returning * into v_job;
    end if;
  elsif v_target_status = 'CANCELLED' then
    if v_job.status in ('COMPLETED', 'PAID', 'IN_PROGRESS') then
      raise exception using
        errcode = '23514',
        message = format('Job status %s cannot be synchronized to CANCELLED', v_job.status);
    end if;

    if v_job.status <> 'CANCELLED' then
      update public.jobs
         set status = 'CANCELLED'
       where business_id = p_business_id
         and id = v_job.id
      returning * into v_job;
    end if;
  end if;

  if v_is_idempotent then
    return jsonb_build_object(
      'appointment', to_jsonb(v_appointment),
      'job', to_jsonb(v_job),
      'activity', null
    );
  end if;

  v_previous_status := v_appointment.status;

  if v_target_status = 'CONFIRMED' then
    update public.appointments
       set status = 'CONFIRMED',
           confirmed_at = v_now,
           completed_at = null,
           cancelled_at = null,
           notes = coalesce(p_notes, notes)
     where business_id = p_business_id
       and id = v_appointment.id
    returning * into v_appointment;
  elsif v_target_status = 'COMPLETED' then
    update public.appointments
       set status = 'COMPLETED',
           completed_at = v_now,
           cancelled_at = null,
           notes = coalesce(p_notes, notes)
     where business_id = p_business_id
       and id = v_appointment.id
    returning * into v_appointment;
  else
    update public.appointments
       set status = 'CANCELLED',
           cancelled_at = v_now,
           completed_at = null,
           notes = coalesce(p_notes, notes)
     where business_id = p_business_id
       and id = v_appointment.id
    returning * into v_appointment;
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
    v_customer.id,
    v_lead.id,
    v_job.id,
    format('appointment.%s', lower(v_target_status)),
    jsonb_build_object(
      'source', v_source,
      'appointment_id', v_appointment.id,
      'job_id', v_job.id,
      'quote_id', v_job.quote_id,
      'lead_id', v_lead.id,
      'previous_status', v_previous_status,
      'new_status', v_target_status
    )
  )
  returning * into v_activity;

  return jsonb_build_object(
    'appointment', to_jsonb(v_appointment),
    'job', to_jsonb(v_job),
    'activity', to_jsonb(v_activity)
  );
end;
$$;

revoke all on function public.transition_appointment_status(uuid, uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.transition_appointment_status(uuid, uuid, text, text, text)
  to service_role;
