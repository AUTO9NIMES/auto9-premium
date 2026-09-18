begin;

alter table public.automation_outbox
  add column provider_message_id text,
  add column provider_accepted_at timestamptz,
  add column delivery_recipient_email text,
  add column delivery_customer_name text,
  add column delivery_review_url text,
  add column delivery_sender_email text,
  add column delivery_subject text,
  add column delivery_text text,
  add column delivery_html text;

alter table public.automation_outbox
  add constraint ck_automation_outbox_provider_acceptance_pair
    check (
      (
        provider_message_id is null
        and provider_accepted_at is null
      )
      or
      (
        provider_message_id is not null
        and length(trim(provider_message_id)) > 0
        and provider_accepted_at is not null
      )
    );

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
        and delivery_review_url is not null
        and length(trim(delivery_review_url)) > 0
        and delivery_sender_email is not null
        and length(trim(delivery_sender_email)) > 0
        and delivery_subject is not null
        and length(trim(delivery_subject)) > 0
        and delivery_text is not null
        and length(delivery_text) > 0
        and delivery_html is not null
        and length(delivery_html) > 0
      )
    );

alter table public.automation_outbox
  add constraint ck_automation_outbox_acceptance_requires_snapshot
    check (
      provider_accepted_at is null
      or (
        delivery_recipient_email is not null
        and delivery_customer_name is not null
        and delivery_review_url is not null
        and delivery_sender_email is not null
        and delivery_subject is not null
        and delivery_text is not null
        and delivery_html is not null
      )
    );

alter table public.automation_outbox
  add constraint ck_automation_outbox_quarantined_not_provider_accepted
    check (
      quarantined_at is null
      or provider_accepted_at is null
    );

drop index public.ix_automation_outbox_claimable;

create index ix_automation_outbox_claimable
  on public.automation_outbox (available_at, created_at, id)
  where processed_at is null
    and quarantined_at is null
    and (
      attempt_count < 5
      or provider_accepted_at is not null
    );

create or replace function public.claim_automation_outbox(
  p_business_id uuid,
  p_limit integer default 10,
  p_lease_seconds integer default 300
)
returns setof public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_business_id is null then
    raise exception using
      errcode = '22023',
      message = 'business_id is required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using
      errcode = '22023',
      message = 'p_limit must be between 1 and 100';
  end if;

  if p_lease_seconds is null
     or p_lease_seconds < 30
     or p_lease_seconds > 3600 then
    raise exception using
      errcode = '22023',
      message = 'p_lease_seconds must be between 30 and 3600';
  end if;

  update public.automation_outbox
     set quarantined_at = now(),
         lease_token = null,
         leased_until = null
   where business_id = p_business_id
     and processed_at is null
     and quarantined_at is null
     and provider_accepted_at is null
     and attempt_count >= 5
     and (
       lease_token is null
       or leased_until <= now()
     );

  return query
  with claimable as (
    select o.id
      from public.automation_outbox o
     where o.business_id = p_business_id
       and o.processed_at is null
       and o.quarantined_at is null
       and (
         o.attempt_count < 5
         or o.provider_accepted_at is not null
       )
       and o.available_at <= now()
       and (
         o.lease_token is null
         or o.leased_until <= now()
       )
     order by o.available_at, o.created_at, o.id
     for update skip locked
     limit p_limit
  )
  update public.automation_outbox o
     set lease_token = gen_random_uuid(),
         leased_until = now() + make_interval(secs => p_lease_seconds),
         attempt_count = case
           when o.provider_accepted_at is not null then o.attempt_count
           else o.attempt_count + 1
         end
    from claimable c
   where o.id = c.id
  returning o.*;
end
$$;

create or replace function public.nack_automation_outbox(
  p_business_id uuid,
  p_outbox_id uuid,
  p_lease_token uuid,
  p_retry_after_seconds integer,
  p_error text default null
)
returns public.automation_outbox
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_outbox public.automation_outbox;
  v_error text;
begin
  if p_business_id is null
     or p_outbox_id is null
     or p_lease_token is null
     or p_retry_after_seconds is null then
    raise exception using
      errcode = '22023',
      message = 'business_id, outbox_id, lease_token and retry_after_seconds are required';
  end if;

  if p_retry_after_seconds < 0 or p_retry_after_seconds > 86400 then
    raise exception using
      errcode = '22023',
      message = 'p_retry_after_seconds must be between 0 and 86400';
  end if;

  v_error := nullif(left(trim(coalesce(p_error, '')), 1000), '');

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

  if v_outbox.provider_accepted_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Provider-accepted outbox event must be ACKed, not NACKed';
  end if;

  if v_outbox.lease_token is distinct from p_lease_token
     or v_outbox.leased_until is null
     or v_outbox.leased_until <= now() then
    raise exception using
      errcode = '40001',
      message = 'Outbox lease is not owned or has expired';
  end if;

  if v_outbox.attempt_count >= 5 then
    update public.automation_outbox
       set quarantined_at = now(),
           lease_token = null,
           leased_until = null,
           last_error = v_error
     where business_id = p_business_id
       and id = p_outbox_id
    returning * into v_outbox;
  else
    update public.automation_outbox
       set available_at = now() + make_interval(secs => p_retry_after_seconds),
           lease_token = null,
           leased_until = null,
           last_error = v_error
     where business_id = p_business_id
       and id = p_outbox_id
    returning * into v_outbox;
  end if;

  return v_outbox;
end
$$;

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
     or v_review_url is null
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
     or length(v_review_url) > 2000
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
     or v_outbox.delivery_review_url is null
     or v_outbox.delivery_sender_email is null
     or v_outbox.delivery_subject is null
     or v_outbox.delivery_text is null
     or v_outbox.delivery_html is null then
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
  if p_business_id is null or p_outbox_id is null or p_lease_token is null then
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

  if v_outbox.event_type = 'review.requested.v1'
     and (
       v_outbox.provider_message_id is null
       or v_outbox.provider_accepted_at is null
     ) then
    raise exception using
      errcode = '40001',
      message = 'Review delivery provider acceptance is required before ACK';
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

revoke all on function public.record_automation_outbox_delivery_snapshot(uuid, uuid, uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_automation_outbox_delivery_snapshot(uuid, uuid, uuid, text, text, text, text, text, text, text)
  to service_role;

revoke all on function public.record_automation_outbox_provider_acceptance(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_automation_outbox_provider_acceptance(uuid, uuid, uuid, text)
  to service_role;

revoke all on function public.ack_automation_outbox(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.ack_automation_outbox(uuid, uuid, uuid)
  to service_role;

revoke all on function public.claim_automation_outbox(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_automation_outbox(uuid, integer, integer)
  to service_role;

revoke all on function public.nack_automation_outbox(uuid, uuid, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.nack_automation_outbox(uuid, uuid, uuid, integer, text)
  to service_role;

commit;
