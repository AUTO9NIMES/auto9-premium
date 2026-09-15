alter table public.review_requests
  add constraint ux_review_requests_business_id
  unique (business_id, id);

create table public.automation_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  event_type text not null,
  review_request_id uuid not null,
  created_at timestamptz not null default now(),

  constraint fk_automation_outbox_business
    foreign key (business_id)
    references public.businesses (id)
    on delete restrict
    on update cascade,

  constraint fk_automation_outbox_review_request
    foreign key (business_id, review_request_id)
    references public.review_requests (business_id, id)
    on delete restrict
    on update cascade,

  constraint ck_automation_outbox_event_type
    check (event_type = 'review.requested.v1'),

  constraint ux_automation_outbox_review_event
    unique (business_id, event_type, review_request_id)
);

alter table public.automation_outbox enable row level security;

revoke all on table public.automation_outbox
  from public, anon, authenticated, service_role;

grant select, insert on table public.automation_outbox
  to service_role;

create or replace function public.request_job_review(
  p_business_id uuid,
  p_idempotency_key uuid,
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
  v_customer public.customers%rowtype;
  v_quote public.quotes%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_payment public.payments%rowtype;
  v_review_request public.review_requests%rowtype;
  v_existing_review_request public.review_requests%rowtype;
  v_activity public.activity_log%rowtype;
begin
  if p_business_id is null or p_idempotency_key is null or p_job_id is null then
    raise exception using errcode = '22023', message = 'business_id, idempotency_key and job_id are required';
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

  select *
    into v_existing_review_request
    from public.review_requests
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key;

  if found then
    if v_existing_review_request.job_id is distinct from p_job_id then
      raise exception using errcode = '23505', message = 'Review request token belongs to another job';
    end if;

    select *
      into v_lead
      from public.leads
     where business_id = p_business_id
       and id = v_job.lead_id
       and customer_id = v_job.customer_id
     for update;

    if not found or v_lead.lifecycle_status <> 'REVIEW_REQUESTED' then
      raise exception using errcode = '23514', message = 'Review request replay has inconsistent lead state';
    end if;

    return jsonb_build_object(
      'review_request', to_jsonb(v_existing_review_request),
      'lead', to_jsonb(v_lead),
      'activity', null,
      'no_op', true
    );
  end if;

  if v_job.status <> 'PAID' then
    raise exception using errcode = '23514', message = format('Job status %s cannot request a review', v_job.status);
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
     and customer_id = v_job.customer_id
   for update;

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

  select *
    into v_payment
    from public.payments
   where business_id = p_business_id
     and job_id = v_job.id;

  if not found then
    raise exception using errcode = '23514', message = 'Paid job has no payment evidence';
  end if;

  if v_lead.lifecycle_status <> 'BOOKED' then
    raise exception using errcode = '23514', message = format('Lead status %s cannot request a review', v_lead.lifecycle_status);
  end if;

  select *
    into v_existing_review_request
    from public.review_requests
   where business_id = p_business_id
     and job_id = v_job.id
   for update;

  if found then
    raise exception using errcode = '23514', message = 'Review has already been requested for this job';
  end if;

  insert into public.review_requests (
    business_id,
    job_id,
    idempotency_key
  ) values (
    p_business_id,
    v_job.id,
    p_idempotency_key
  )
  on conflict (business_id, idempotency_key)
  do nothing
  returning * into v_review_request;

  if not found then
    select *
      into v_existing_review_request
      from public.review_requests
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key;

    if not found or v_existing_review_request.job_id is distinct from p_job_id then
      raise exception using errcode = '23505', message = 'Review request token conflict';
    end if;

    raise exception using errcode = '40001', message = 'Review request replay could not be resolved';
  end if;

  update public.leads
     set lifecycle_status = 'REVIEW_REQUESTED'
   where business_id = p_business_id
     and id = v_lead.id
     and lifecycle_status = 'BOOKED'
  returning * into v_lead;

  if not found then
    raise exception using errcode = '40001', message = 'Lead could not be marked for review';
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
    v_lead.id,
    v_job.id,
    'review.requested',
    jsonb_build_object(
      'source', 'crm_review_ui',
      'review_request_id', v_review_request.id,
      'job_id', v_job.id,
      'lead_id', v_lead.id
    )
  ) returning * into v_activity;

  insert into public.automation_outbox (
    business_id,
    event_type,
    review_request_id
  ) values (
    p_business_id,
    'review.requested.v1',
    v_review_request.id
  );

  return jsonb_build_object(
    'review_request', to_jsonb(v_review_request),
    'lead', to_jsonb(v_lead),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$$;

revoke all on function public.request_job_review(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.request_job_review(uuid, uuid, uuid)
  to service_role;
