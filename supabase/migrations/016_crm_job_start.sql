create or replace function public.start_job(
  p_business_id uuid,
  p_job_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_job public.jobs%rowtype;
  v_lead public.leads%rowtype;
  v_quote public.quotes%rowtype;
  v_customer public.customers%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_activity public.activity_log%rowtype;
  v_started_at timestamptz := now();
begin
  if p_business_id is null or p_job_id is null then
    raise exception using errcode = '22023', message = 'business_id and job_id are required';
  end if;

  select *
    into v_job
    from public.jobs
   where business_id = p_business_id
     and id = p_job_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Job not found for the requested business';
  end if;

  if v_job.status = 'IN_PROGRESS' then
    if v_job.started_at is null then
      raise exception using errcode = '23514', message = 'In-progress job is missing started_at';
    end if;

    return jsonb_build_object(
      'job', to_jsonb(v_job),
      'activity', null,
      'no_op', true
    );
  end if;

  if v_job.status <> 'CONFIRMED' then
    raise exception using errcode = '23514', message = format('Job status %s cannot be started', v_job.status);
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

  update public.jobs
     set status = 'IN_PROGRESS',
         started_at = v_started_at
   where business_id = p_business_id
     and id = v_job.id
     and status = 'CONFIRMED'
  returning * into v_job;

  if not found then
    raise exception using errcode = '40001', message = 'Job could not be started';
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
    'job.started',
    jsonb_build_object(
      'source', 'crm_job_ui',
      'job_id', v_job.id,
      'lead_id', v_job.lead_id,
      'quote_id', v_job.quote_id
    )
  ) returning * into v_activity;

  return jsonb_build_object(
    'job', to_jsonb(v_job),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$$;

revoke all on function public.start_job(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.start_job(uuid, uuid)
  to service_role;
