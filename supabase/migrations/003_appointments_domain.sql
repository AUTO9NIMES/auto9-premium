create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  lead_id uuid,
  quote_id uuid,
  job_id uuid not null,
  vehicle_id uuid,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  requested_at timestamptz not null,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_appointments_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_appointments_customer
    foreign key (business_id, customer_id)
    references public.customers (business_id, id)
    on delete restrict
    on update cascade,
  constraint fk_appointments_lead
    foreign key (business_id, customer_id, lead_id)
    references public.leads (business_id, customer_id, id)
    on delete restrict
    on update cascade,
  constraint fk_appointments_quote
    foreign key (business_id, lead_id, quote_id)
    references public.quotes (business_id, lead_id, id)
    on delete restrict
    on update cascade,
  constraint fk_appointments_job
    foreign key (business_id, job_id)
    references public.jobs (business_id, id)
    on delete restrict
    on update cascade,
  constraint fk_appointments_vehicle
    foreign key (business_id, customer_id, vehicle_id)
    references public.vehicles (business_id, customer_id, id)
    on delete restrict
    on update cascade,
  constraint chk_appointments_quote_requires_lead
    check (quote_id is null or lead_id is not null)
);

create unique index if not exists ux_appointments_business_job_id
  on public.appointments (business_id, job_id);

create index if not exists idx_appointments_business_status
  on public.appointments (business_id, status);

create index if not exists idx_appointments_business_requested_at
  on public.appointments (business_id, requested_at);

create index if not exists idx_appointments_business_customer
  on public.appointments (business_id, customer_id);

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

revoke all on table public.appointments from public, anon, authenticated;
grant all on table public.appointments to service_role;

do $$
begin
  if to_regprocedure('public.accept_quote_and_create_job(uuid,uuid,text)') is null then
    raise exception 'Step 2A acceptance RPC is required before applying Step 2B';
  end if;
end;
$$;

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
  v_existing_appointment public.appointments%rowtype;
  v_appointment public.appointments%rowtype;
  v_activity public.activity_log%rowtype;
  v_has_existing_job boolean := false;
  v_has_existing_appointment boolean := false;
  v_source text := coalesce(nullif(trim(p_source), ''), 'internal');
  v_requested_at timestamptz;
  v_requested_at_raw text;
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

    v_job := v_existing_job;
  elsif v_quote.status in ('DRAFT', 'SENT') then
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
  else
    raise exception using
      errcode = '23514',
      message = format('Quote status %s cannot be accepted', v_quote.status);
  end if;

  v_requested_at_raw := nullif(trim(v_quote.payload_json->>'availabilityDateTime'), '');

  if v_requested_at_raw is not null
     and v_requested_at_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'
  then
    begin
      v_requested_at :=
        (v_requested_at_raw::timestamp without time zone)
        at time zone 'Europe/Paris';
    exception when others then
      v_requested_at := null;
    end;
  end if;

  if v_requested_at is not null then
    select *
      into v_existing_appointment
      from public.appointments
     where business_id = p_business_id
       and job_id = v_job.id
     for update;

    v_has_existing_appointment := found;

    if v_has_existing_appointment then
      if v_existing_appointment.customer_id is distinct from v_customer.id
         or v_existing_appointment.lead_id is distinct from v_lead.id
         or v_existing_appointment.quote_id is distinct from v_quote.id
         or v_existing_appointment.vehicle_id is distinct from v_lead.vehicle_id
      then
        raise exception using
          errcode = '23514',
          message = 'Existing appointment relationships do not match the quote';
      end if;

      v_appointment := v_existing_appointment;
    else
      insert into public.appointments (
        business_id,
        customer_id,
        lead_id,
        quote_id,
        job_id,
        vehicle_id,
        status,
        requested_at
      ) values (
        p_business_id,
        v_customer.id,
        v_lead.id,
        v_quote.id,
        v_job.id,
        v_lead.vehicle_id,
        'REQUESTED',
        v_requested_at
      )
      returning * into v_appointment;

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
        'appointment.requested',
        jsonb_build_object(
          'source', v_source,
          'quote_id', v_quote.id,
          'lead_id', v_lead.id,
          'job_id', v_job.id,
          'appointment_id', v_appointment.id
        )
      );
    end if;
  end if;

  if v_quote.status = 'ACCEPTED' and not v_has_existing_appointment and v_appointment.id is null then
    v_appointment := null;
  end if;

  if v_quote.status = 'ACCEPTED' then
    return jsonb_build_object(
      'quote', to_jsonb(v_quote),
      'lead', to_jsonb(v_lead),
      'job', to_jsonb(v_job),
      'appointment', to_jsonb(v_appointment),
      'activity', null
    );
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
    'appointment', to_jsonb(v_appointment),
    'activity', to_jsonb(v_activity)
  );
end;
$$;

revoke all on function public.accept_quote_and_create_job(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.accept_quote_and_create_job(uuid, uuid, text)
  to service_role;
