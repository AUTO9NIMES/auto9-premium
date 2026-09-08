alter table public.leads
  add column if not exists vehicle_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_leads_vehicle'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint fk_leads_vehicle
      foreign key (business_id, customer_id, vehicle_id)
      references public.vehicles (business_id, customer_id, id)
      on delete restrict
      on update cascade;
  end if;
end;
$$;

create index if not exists idx_leads_business_vehicle
  on public.leads (business_id, vehicle_id);

do $$
begin
  alter table public.jobs
    drop constraint if exists jobs_status_check;

  alter table public.jobs
    add constraint jobs_status_check
    check (status in ('QUOTE_ACCEPTED', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAID'));
end;
$$;

create unique index if not exists ux_jobs_business_quote_id
  on public.jobs (business_id, quote_id)
  where quote_id is not null;

create or replace function public.accept_quote_and_create_job(
  p_business_id uuid,
  p_quote_id uuid,
  p_source text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_quote public.quotes%rowtype;
  v_lead public.leads%rowtype;
  v_customer public.customers%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_existing_job public.jobs%rowtype;
  v_job public.jobs%rowtype;
  v_activity public.activity_log%rowtype;
  v_has_existing_job boolean := false;
  v_source text := coalesce(nullif(trim(p_source), ''), 'internal');
begin
  if p_business_id is null or p_quote_id is null then
    raise exception using
      errcode = '22023',
      message = 'business_id and quote_id are required';
  end if;

  select *
    into v_quote
    from public.quotes
   where business_id = p_business_id
     and id = p_quote_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Quote not found for the requested business';
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = v_quote.lead_id
   for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Quote lead does not belong to the requested business';
  end if;

  select *
    into v_customer
    from public.customers
   where business_id = p_business_id
     and id = v_lead.customer_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Lead customer does not belong to the requested business';
  end if;

  if v_lead.vehicle_id is not null then
    select *
      into v_vehicle
      from public.vehicles
     where business_id = p_business_id
       and customer_id = v_lead.customer_id
       and id = v_lead.vehicle_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'Lead vehicle does not belong to the requested business and customer';
    end if;
  end if;

  select *
    into v_existing_job
    from public.jobs
   where business_id = p_business_id
     and quote_id = p_quote_id
   for update;

  v_has_existing_job := found;

  if v_has_existing_job then
     if v_existing_job.lead_id is distinct from v_lead.id
       or v_existing_job.customer_id is distinct from v_lead.customer_id
       or (v_lead.vehicle_id is not null and v_existing_job.vehicle_id is distinct from v_lead.vehicle_id)
    then
      raise exception using
        errcode = '23514',
        message = 'Existing job relationships do not match the quote';
    end if;

    if v_existing_job.vehicle_id is not null then
      select *
        into v_vehicle
        from public.vehicles
       where business_id = p_business_id
         and customer_id = v_lead.customer_id
         and id = v_existing_job.vehicle_id;

      if not found then
        raise exception using
          errcode = '23503',
          message = 'Existing job vehicle does not belong to the requested business and customer';
      end if;
    end if;
  end if;

  if v_quote.status = 'ACCEPTED' then
    if not v_has_existing_job then
      raise exception using
        errcode = '23514',
        message = 'Accepted quote has no associated job';
    end if;

    if v_lead.lifecycle_status is distinct from 'BOOKED' then
      raise exception using
        errcode = '23514',
        message = 'Accepted quote lead is not booked';
    end if;

    return jsonb_build_object(
      'quote', to_jsonb(v_quote),
      'lead', to_jsonb(v_lead),
      'job', to_jsonb(v_existing_job),
      'activity', null
    );
  end if;

  if v_quote.status not in ('DRAFT', 'SENT') then
    raise exception using
      errcode = '23514',
      message = format('Quote status %s cannot be accepted', v_quote.status);
  end if;

  if v_has_existing_job then
    raise exception using
      errcode = '23514',
      message = 'A job already exists for a quote that is not accepted';
  end if;

  update public.quotes
     set status = 'ACCEPTED'
   where business_id = p_business_id
     and id = p_quote_id
     and status in ('DRAFT', 'SENT')
  returning * into v_quote;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Quote could not be accepted';
  end if;

  update public.leads
     set lifecycle_status = 'BOOKED'
   where business_id = p_business_id
     and id = v_lead.id
     and customer_id = v_customer.id
  returning * into v_lead;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Lead could not be booked';
  end if;

  insert into public.jobs (
    business_id,
    customer_id,
    lead_id,
    vehicle_id,
    quote_id,
    title,
    status,
    total_amount
  ) values (
    p_business_id,
    v_customer.id,
    v_lead.id,
    v_lead.vehicle_id,
    v_quote.id,
    'AUTO9 quote ' || v_quote.id::text,
    'QUOTE_ACCEPTED',
    v_quote.total_price
  )
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
    v_customer.id,
    v_lead.id,
    v_job.id,
    'quote.accepted',
    jsonb_build_object(
      'source', v_source,
      'quote_id', v_quote.id,
      'lead_id', v_lead.id,
      'job_id', v_job.id
    )
  )
  returning * into v_activity;

  return jsonb_build_object(
    'quote', to_jsonb(v_quote),
    'lead', to_jsonb(v_lead),
    'job', to_jsonb(v_job),
    'activity', to_jsonb(v_activity)
  );
end;
$$;

revoke all on function public.accept_quote_and_create_job(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.accept_quote_and_create_job(uuid, uuid, text)
  to service_role;
