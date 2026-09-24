begin;

alter table public.crm_subscription_booking_requests
  add column if not exists lead_id uuid,
  add column if not exists job_id uuid,
  add column if not exists appointment_id uuid;

create unique index if not exists
  ux_crm_subscription_booking_requests_business_lead
  on public.crm_subscription_booking_requests (business_id, lead_id)
  where lead_id is not null;

create unique index if not exists
  ux_crm_subscription_booking_requests_business_job
  on public.crm_subscription_booking_requests (business_id, job_id)
  where job_id is not null;

create unique index if not exists
  ux_crm_subscription_booking_requests_business_appointment
  on public.crm_subscription_booking_requests (business_id, appointment_id)
  where appointment_id is not null;

alter table public.crm_subscription_booking_requests
  add constraint fk_crm_subscription_booking_requests_lead
  foreign key (business_id, customer_id, lead_id)
  references public.leads (business_id, customer_id, id)
  on delete restrict
  on update cascade;

alter table public.crm_subscription_booking_requests
  add constraint fk_crm_subscription_booking_requests_job
  foreign key (business_id, job_id)
  references public.jobs (business_id, id)
  on delete restrict
  on update cascade;

alter table public.crm_subscription_booking_requests
  add constraint fk_crm_subscription_booking_requests_appointment
  foreign key (business_id, appointment_id)
  references public.appointments (business_id, id)
  on delete restrict
  on update cascade;

create or replace function public.confirm_subscription_booking_request(
  p_business_id uuid,
  p_booking_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_request public.crm_subscription_booking_requests%rowtype;
  v_subscription public.crm_subscriptions%rowtype;
  v_lead_result jsonb;
  v_lead public.leads%rowtype;
  v_job public.jobs%rowtype;
  v_appointment public.appointments%rowtype;
  v_local timestamp without time zone;
  v_scheduled_at timestamptz;
  v_candidate_count integer;
  v_idempotency_key uuid;
begin
  if p_business_id is null or p_booking_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'business_id and booking_request_id are required';
  end if;

  select *
    into v_request
    from public.crm_subscription_booking_requests
   where business_id = p_business_id
     and id = p_booking_request_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Subscription booking request not found';
  end if;

  if v_request.status = 'CONFIRMED' then
    if v_request.lead_id is null
       or v_request.job_id is null
       or v_request.appointment_id is null then
      raise exception using
        errcode = '23514',
        message = 'Confirmed subscription booking request has incomplete operational links';
    end if;

    return jsonb_build_object(
      'booking_request_id', v_request.id,
      'lead_id', v_request.lead_id,
      'job_id', v_request.job_id,
      'appointment_id', v_request.appointment_id,
      'no_op', true
    );
  end if;

  if v_request.status <> 'REQUESTED' then
    raise exception using
      errcode = '23514',
      message = 'Only a REQUESTED subscription booking request can be confirmed';
  end if;

  if v_request.lead_id is not null
     or v_request.job_id is not null
     or v_request.appointment_id is not null then
    raise exception using
      errcode = '23514',
      message = 'REQUESTED subscription booking request already has operational links';
  end if;

  select *
    into v_subscription
    from public.crm_subscriptions
   where business_id = p_business_id
     and customer_id = v_request.customer_id
     and id = v_request.subscription_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Subscription not found for booking request';
  end if;

  if not v_subscription.active then
    raise exception using
      errcode = '23514',
      message = 'Paused subscription booking request cannot be confirmed';
  end if;

  v_local :=
    v_request.requested_date + v_request.requested_time;

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
      message = 'Subscription booking slot does not exist in Europe/Paris';
  elsif v_candidate_count > 1 then
    raise exception using
      errcode = '22023',
      message = 'Subscription booking slot is ambiguous in Europe/Paris';
  end if;

  if v_scheduled_at <= now() then
    raise exception using
      errcode = '22023',
      message = 'Subscription booking request must target a future slot';
  end if;

  /*
   * Derive a deterministic UUID from the booking-request UUID without
   * requiring an extension. This key is used only for canonical lead
   * idempotency and is stable across transaction retries.
   */
  v_idempotency_key := (
    substr(md5('subscription-booking:' || v_request.id::text), 1, 8) || '-' ||
    substr(md5('subscription-booking:' || v_request.id::text), 9, 4) || '-' ||
    '4' || substr(md5('subscription-booking:' || v_request.id::text), 14, 3) || '-' ||
    '8' || substr(md5('subscription-booking:' || v_request.id::text), 18, 3) || '-' ||
    substr(md5('subscription-booking:' || v_request.id::text), 21, 12)
  )::uuid;

  v_lead_result := public.create_manual_lead(
    p_business_id,
    v_idempotency_key,
    v_request.customer_id,
    v_subscription.service_name,
    null,
    v_subscription.price,
    null,
    'Demande de réservation abonnement'
  );

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and customer_id = v_request.customer_id
     and id = (v_lead_result ->> 'lead_id')::uuid
   for update;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Subscription booking lead could not be resolved';
  end if;

  if v_lead.lifecycle_status = 'NEW' then
    update public.leads
       set lifecycle_status = 'BOOKED',
           updated_at = now()
     where business_id = p_business_id
       and id = v_lead.id
       and lifecycle_status = 'NEW'
     returning * into v_lead;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'Subscription booking lead transition could not be resolved';
    end if;

    insert into public.activity_log (
      business_id,
      customer_id,
      lead_id,
      event_type,
      event_data
    ) values (
      p_business_id,
      v_request.customer_id,
      v_lead.id,
      'lead.status_changed',
      jsonb_build_object(
        'source', 'subscription_booking_handoff',
        'lead_id', v_lead.id,
        'previous_status', 'NEW',
        'new_status', 'BOOKED'
      )
    );
  elsif v_lead.lifecycle_status <> 'BOOKED' then
    raise exception using
      errcode = '23514',
      message = 'Subscription booking lead is not in a handoff-compatible lifecycle state';
  end if;

  insert into public.jobs (
    business_id,
    customer_id,
    lead_id,
    vehicle_id,
    quote_id,
    title,
    status,
    scheduled_at,
    total_amount,
    notes
  ) values (
    p_business_id,
    v_request.customer_id,
    v_lead.id,
    v_lead.vehicle_id,
    null,
    v_subscription.service_name,
    'SCHEDULED',
    v_scheduled_at,
    v_subscription.price,
    'Créé depuis une demande de réservation abonnement'
  )
  returning * into v_job;

  insert into public.appointments (
    business_id,
    customer_id,
    lead_id,
    job_id,
    quote_id,
    vehicle_id,
    status,
    requested_at,
    scheduled_at
  ) values (
    p_business_id,
    v_request.customer_id,
    v_lead.id,
    v_job.id,
    null,
    v_job.vehicle_id,
    'REQUESTED',
    now(),
    v_scheduled_at
  )
  returning * into v_appointment;

  update public.crm_subscription_booking_requests
     set status = 'CONFIRMED',
         lead_id = v_lead.id,
         job_id = v_job.id,
         appointment_id = v_appointment.id,
         updated_at = now()
   where business_id = p_business_id
     and customer_id = v_request.customer_id
     and subscription_id = v_request.subscription_id
     and id = v_request.id
     and status = 'REQUESTED'
  returning * into v_request;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Subscription booking request confirmation could not be resolved';
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
    v_request.customer_id,
    v_lead.id,
    v_job.id,
    'subscription.booking.confirmed',
    jsonb_build_object(
      'booking_request_id', v_request.id,
      'subscription_id', v_request.subscription_id,
      'appointment_id', v_appointment.id,
      'scheduled_at', v_scheduled_at
    )
  );

  return jsonb_build_object(
    'booking_request_id', v_request.id,
    'lead_id', v_lead.id,
    'job_id', v_job.id,
    'appointment_id', v_appointment.id,
    'no_op', false
  );
end;
$$;

revoke all on function public.confirm_subscription_booking_request(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.confirm_subscription_booking_request(uuid, uuid)
  to service_role;

commit;
