begin;

-- Generalize automation_outbox so one reliable delivery engine can carry
-- both review requests and appointment confirmations.

alter table public.automation_outbox
  add column appointment_id uuid;

-- Required candidate key for the tenant-scoped appointment FK below.
-- appointments.id is already globally unique, but PostgreSQL requires the
-- exact referenced column set to be backed by a UNIQUE/PRIMARY constraint.
create unique index if not exists ux_appointments_business_id
  on public.appointments (business_id, id);

alter table public.automation_outbox
  alter column review_request_id drop not null;

alter table public.automation_outbox
  add constraint fk_automation_outbox_appointment
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete restrict
    on update cascade;

alter table public.automation_outbox
  drop constraint ck_automation_outbox_event_type;

alter table public.automation_outbox
  add constraint ck_automation_outbox_event_type
    check (
      event_type in (
        'review.requested.v1',
        'appointment.confirmed.v1'
      )
    );

alter table public.automation_outbox
  add constraint ck_automation_outbox_event_reference
    check (
      (
        event_type = 'review.requested.v1'
        and review_request_id is not null
        and appointment_id is null
      )
      or
      (
        event_type = 'appointment.confirmed.v1'
        and review_request_id is null
        and appointment_id is not null
      )
    );

create unique index ux_automation_outbox_appointment_event
  on public.automation_outbox (
    business_id,
    event_type,
    appointment_id
  )
  where appointment_id is not null;

-- delivery_review_url belongs only to review.requested.v1.
-- All other snapshot fields remain common to transactional email delivery.

alter table public.automation_outbox
  drop constraint ck_automation_outbox_delivery_snapshot;

alter table public.automation_outbox
  add constraint ck_automation_outbox_delivery_snapshot
    check (
      (
        delivery_recipient_email is null
        and delivery_customer_name is null
        and delivery_review_url is null
        and delivery_sender_email is null
        and delivery_subject is null
        and delivery_text is null
        and delivery_html is null
      )
      or
      (
        delivery_recipient_email is not null
        and length(trim(delivery_recipient_email)) > 0
        and delivery_customer_name is not null
        and length(trim(delivery_customer_name)) > 0
        and delivery_sender_email is not null
        and length(trim(delivery_sender_email)) > 0
        and delivery_subject is not null
        and length(trim(delivery_subject)) > 0
        and delivery_text is not null
        and length(delivery_text) > 0
        and delivery_html is not null
        and length(delivery_html) > 0
        and (
          (
            event_type = 'review.requested.v1'
            and delivery_review_url is not null
            and length(trim(delivery_review_url)) > 0
          )
          or
          (
            event_type = 'appointment.confirmed.v1'
            and delivery_review_url is null
          )
        )
      )
    );

alter table public.automation_outbox
  drop constraint ck_automation_outbox_acceptance_requires_snapshot;

alter table public.automation_outbox
  add constraint ck_automation_outbox_acceptance_requires_snapshot
    check (
      provider_accepted_at is null
      or (
        delivery_recipient_email is not null
        and delivery_customer_name is not null
        and delivery_sender_email is not null
        and delivery_subject is not null
        and delivery_text is not null
        and delivery_html is not null
        and (
          (
            event_type = 'review.requested.v1'
            and delivery_review_url is not null
          )
          or
          (
            event_type = 'appointment.confirmed.v1'
            and delivery_review_url is null
          )
        )
      )
    );

-- Generalize the immutable delivery snapshot RPC.
-- Existing review callers continue supplying p_review_url.
-- Appointment confirmations supply NULL.

create or replace function public.record_automation_outbox_delivery_snapshot(
  p_business_id uuid,
  p_outbox_id uuid,
  p_lease_token uuid,
  p_recipient_email text,
  p_customer_name text,
  p_review_url text,
  p_sender_email text,
  p_subject text,
  p_text text,
  p_html text
)
returns public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_outbox public.automation_outbox;
  v_recipient_email text;
  v_customer_name text;
  v_review_url text;
  v_sender_email text;
  v_subject text;
  v_text text;
  v_html text;
begin
  if p_business_id is null
     or p_outbox_id is null
     or p_lease_token is null then
    raise exception using
      errcode = '22023',
      message = 'business_id, outbox_id and lease_token are required';
  end if;

  v_recipient_email := nullif(trim(p_recipient_email), '');
  v_customer_name := nullif(trim(p_customer_name), '');
  v_review_url := nullif(trim(p_review_url), '');
  v_sender_email := nullif(trim(p_sender_email), '');
  v_subject := nullif(trim(p_subject), '');
  v_text := nullif(p_text, '');
  v_html := nullif(p_html, '');

  if v_recipient_email is null
     or v_customer_name is null
     or v_sender_email is null
     or v_subject is null
     or v_text is null
     or v_html is null then
    raise exception using
      errcode = '22023',
      message = 'delivery snapshot fields are required';
  end if;

  if length(v_recipient_email) > 500
     or length(v_customer_name) > 500
     or length(coalesce(v_review_url, '')) > 2000
     or length(v_sender_email) > 500
     or length(v_subject) > 1000
     or length(v_text) > 20000
     or length(v_html) > 100000 then
    raise exception using
      errcode = '22023',
      message = 'delivery snapshot field is too long';
  end if;

  select *
    into v_outbox
    from public.automation_outbox
   where business_id = p_business_id
     and id = p_outbox_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Outbox event not found';
  end if;

  if v_outbox.processed_at is not null
     or v_outbox.quarantined_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already terminal';
  end if;

  if v_outbox.provider_accepted_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Provider acceptance already exists';
  end if;

  if v_outbox.lease_token is distinct from p_lease_token
     or v_outbox.leased_until is null
     or v_outbox.leased_until <= now() then
    raise exception using
      errcode = '40001',
      message = 'Outbox lease is not owned or has expired';
  end if;

  if v_outbox.event_type = 'review.requested.v1'
     and v_review_url is null then
    raise exception using
      errcode = '22023',
      message = 'review_url is required for review.requested.v1';
  end if;

  if v_outbox.event_type = 'appointment.confirmed.v1'
     and v_review_url is not null then
    raise exception using
      errcode = '22023',
      message = 'review_url must be null for appointment.confirmed.v1';
  end if;

  if v_outbox.delivery_recipient_email is not null then
    if v_outbox.delivery_recipient_email is distinct from v_recipient_email
       or v_outbox.delivery_customer_name is distinct from v_customer_name
       or v_outbox.delivery_review_url is distinct from v_review_url
       or v_outbox.delivery_sender_email is distinct from v_sender_email
       or v_outbox.delivery_subject is distinct from v_subject
       or v_outbox.delivery_text is distinct from v_text
       or v_outbox.delivery_html is distinct from v_html then
      raise exception using
        errcode = '40001',
        message = 'Outbox delivery snapshot does not match';
    end if;

    return v_outbox;
  end if;

  update public.automation_outbox
     set delivery_recipient_email = v_recipient_email,
         delivery_customer_name = v_customer_name,
         delivery_review_url = v_review_url,
         delivery_sender_email = v_sender_email,
         delivery_subject = v_subject,
         delivery_text = v_text,
         delivery_html = v_html
   where business_id = p_business_id
     and id = p_outbox_id
  returning * into v_outbox;

  return v_outbox;
end
$$;

revoke all on function public.record_automation_outbox_delivery_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.record_automation_outbox_delivery_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, text
) to service_role;

-- Provider acceptance must accept either valid snapshot shape.

create or replace function public.record_automation_outbox_provider_acceptance(
  p_business_id uuid,
  p_outbox_id uuid,
  p_lease_token uuid,
  p_provider_message_id text
)
returns public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_outbox public.automation_outbox;
  v_provider_message_id text;
begin
  if p_business_id is null
     or p_outbox_id is null
     or p_lease_token is null then
    raise exception using
      errcode = '22023',
      message = 'business_id, outbox_id and lease_token are required';
  end if;

  v_provider_message_id := nullif(trim(p_provider_message_id), '');

  if v_provider_message_id is null
     or length(v_provider_message_id) > 500 then
    raise exception using
      errcode = '22023',
      message = 'provider_message_id is required and must be at most 500 characters';
  end if;

  select *
    into v_outbox
    from public.automation_outbox
   where business_id = p_business_id
     and id = p_outbox_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Outbox event not found';
  end if;

  if v_outbox.processed_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already processed';
  end if;

  if v_outbox.quarantined_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already quarantined';
  end if;

  if v_outbox.lease_token is distinct from p_lease_token
     or v_outbox.leased_until is null
     or v_outbox.leased_until <= now() then
    raise exception using
      errcode = '40001',
      message = 'Outbox lease is not owned or has expired';
  end if;

  if v_outbox.delivery_recipient_email is null
     or v_outbox.delivery_customer_name is null
     or v_outbox.delivery_sender_email is null
     or v_outbox.delivery_subject is null
     or v_outbox.delivery_text is null
     or v_outbox.delivery_html is null
     or (
       v_outbox.event_type = 'review.requested.v1'
       and v_outbox.delivery_review_url is null
     )
     or (
       v_outbox.event_type = 'appointment.confirmed.v1'
       and v_outbox.delivery_review_url is not null
     ) then
    raise exception using
      errcode = '40001',
      message = 'Delivery snapshot must exist before provider acceptance';
  end if;

  if v_outbox.provider_accepted_at is not null then
    if v_outbox.provider_message_id is distinct from v_provider_message_id then
      raise exception using
        errcode = '40001',
        message = 'Outbox provider acceptance identity does not match';
    end if;

    return v_outbox;
  end if;

  update public.automation_outbox
     set provider_message_id = v_provider_message_id,
         provider_accepted_at = now()
   where business_id = p_business_id
     and id = p_outbox_id
  returning * into v_outbox;

  return v_outbox;
end
$$;

revoke all on function public.record_automation_outbox_provider_acceptance(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.record_automation_outbox_provider_acceptance(
  uuid, uuid, uuid, text
) to service_role;

-- ACK requires provider acceptance for every externally delivered event.

create or replace function public.ack_automation_outbox(
  p_business_id uuid,
  p_outbox_id uuid,
  p_lease_token uuid
)
returns public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_outbox public.automation_outbox;
begin
  if p_business_id is null
     or p_outbox_id is null
     or p_lease_token is null then
    raise exception using
      errcode = '22023',
      message = 'business_id, outbox_id and lease_token are required';
  end if;

  select *
    into v_outbox
    from public.automation_outbox
   where business_id = p_business_id
     and id = p_outbox_id
   for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Outbox event not found';
  end if;

  if v_outbox.processed_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already processed';
  end if;

  if v_outbox.quarantined_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Outbox event is already quarantined';
  end if;

  if v_outbox.lease_token is distinct from p_lease_token
     or v_outbox.leased_until is null
     or v_outbox.leased_until <= now() then
    raise exception using
      errcode = '40001',
      message = 'Outbox lease is not owned or has expired';
  end if;

  if v_outbox.provider_accepted_at is null
     or v_outbox.provider_message_id is null then
    raise exception using
      errcode = '40001',
      message = 'Provider acceptance is required before ACK';
  end if;

  update public.automation_outbox
     set processed_at = now(),
         lease_token = null,
         leased_until = null,
         last_error = null
   where business_id = p_business_id
     and id = p_outbox_id
  returning * into v_outbox;

  return v_outbox;
end
$$;

revoke all on function public.ack_automation_outbox(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.ack_automation_outbox(uuid, uuid, uuid)
  to service_role;

-- Replace the canonical transition RPC, preserving the schedule guard from
-- migration 025 and adding exactly one transactional outbox event on the
-- first REQUESTED -> CONFIRMED transition.

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
    if v_appointment.scheduled_at is null
       or v_job.scheduled_at is null
       or v_appointment.scheduled_at is distinct from v_job.scheduled_at
    then
      raise exception using
        errcode = '23514',
        message = 'Operational schedule projection is inconsistent';
    end if;

    if v_is_idempotent then
      if v_job.status <> 'CONFIRMED' then
        raise exception using
          errcode = '23514',
          message = format(
            'Confirmed appointment requires CONFIRMED job status, got %s',
            v_job.status
          );
      end if;
    elsif v_appointment.status = 'REQUESTED' then
      if v_job.status <> 'SCHEDULED' then
        raise exception using
          errcode = '23514',
          message = format(
            'Requested appointment requires SCHEDULED job status before confirmation, got %s',
            v_job.status
          );
      end if;
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

  if v_previous_status = 'REQUESTED'
     and v_target_status = 'CONFIRMED'
  then
    insert into public.automation_outbox (
      business_id,
      event_type,
      appointment_id
    ) values (
      p_business_id,
      'appointment.confirmed.v1',
      v_appointment.id
    )
    on conflict (business_id, event_type, appointment_id)
      where appointment_id is not null
    do nothing;
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

commit;
