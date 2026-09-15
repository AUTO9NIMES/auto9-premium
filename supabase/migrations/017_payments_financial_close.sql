create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  job_id uuid not null,
  amount numeric(10,2) not null,
  method text not null check (method in ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  idempotency_key uuid not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint fk_payments_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_payments_job
    foreign key (business_id, job_id)
    references public.jobs (business_id, id)
    on delete restrict
    on update cascade,
  constraint chk_payments_amount_positive
    check (amount > 0),
  constraint ux_payments_business_idempotency_key
    unique (business_id, idempotency_key)
);

create index if not exists idx_payments_business_job_received_at
  on public.payments (business_id, job_id, received_at desc);

revoke all on table public.payments from public, anon, authenticated;
grant all on table public.payments to service_role;

create or replace function public.record_job_payment(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_job_id uuid,
  p_method text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_job public.jobs%rowtype;
  v_payment public.payments%rowtype;
  v_existing_payment public.payments%rowtype;
  v_activity public.activity_log%rowtype;
  v_method text := upper(trim(coalesce(p_method, '')));
  v_payment_found boolean := false;
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
    into v_existing_payment
    from public.payments
   where business_id = p_business_id
     and idempotency_key = p_idempotency_key;

  if found then
    if v_existing_payment.job_id is distinct from p_job_id then
      raise exception using errcode = '23505', message = 'Payment request token belongs to another job';
    end if;

    return jsonb_build_object(
      'payment', to_jsonb(v_existing_payment),
      'job', to_jsonb(v_job),
      'activity', null,
      'no_op', true
    );
  end if;

  if v_method not in ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER') then
    raise exception using errcode = '22023', message = 'payment method is invalid';
  end if;

  if v_job.status = 'PAID' then
    if exists (
      select 1
        from public.payments
       where business_id = p_business_id
         and job_id = p_job_id
    ) then
      raise exception using errcode = '23514', message = 'Job is already financially settled';
    end if;

    raise exception using errcode = '23514', message = 'Job has legacy PAID status without payment evidence';
  end if;

  if v_job.status <> 'COMPLETED' then
    raise exception using errcode = '23514', message = format('Job status %s cannot record payment', v_job.status);
  end if;

  if v_job.total_amount is null or v_job.total_amount <= 0 then
    raise exception using errcode = '23514', message = 'Job amount due is invalid';
  end if;

  select *
    into v_existing_payment
    from public.payments
   where business_id = p_business_id
     and job_id = p_job_id
   for update;

  v_payment_found := found;

  if v_payment_found then
    raise exception using errcode = '23514', message = 'Job is already financially settled';
  end if;

  insert into public.payments (
    business_id,
    job_id,
    amount,
    method,
    idempotency_key
  ) values (
    p_business_id,
    p_job_id,
    v_job.total_amount,
    v_method,
    p_idempotency_key
  )
  on conflict (business_id, idempotency_key)
  do nothing
  returning * into v_payment;

  if not found then
    select *
      into v_existing_payment
      from public.payments
     where business_id = p_business_id
       and idempotency_key = p_idempotency_key;

    if not found or v_existing_payment.job_id is distinct from p_job_id then
      raise exception using errcode = '23505', message = 'Payment request token conflict';
    end if;

    return jsonb_build_object(
      'payment', to_jsonb(v_existing_payment),
      'job', to_jsonb(v_job),
      'activity', null,
      'no_op', true
    );
  end if;

  update public.jobs
     set status = 'PAID'
   where business_id = p_business_id
     and id = p_job_id
     and status = 'COMPLETED'
  returning * into v_job;

  if not found then
    raise exception using errcode = '40001', message = 'Job could not be marked as paid';
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
    'payment.recorded',
    jsonb_build_object(
      'source', 'crm_payment_ui',
      'payment_id', v_payment.id,
      'job_id', v_job.id
    )
  ) returning * into v_activity;

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'job', to_jsonb(v_job),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$$;

revoke all on function public.record_job_payment(uuid, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.record_job_payment(uuid, uuid, uuid, text)
  to service_role;
