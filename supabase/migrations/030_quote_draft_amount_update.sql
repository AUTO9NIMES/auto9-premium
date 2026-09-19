begin;

-- Draft Quote Amount Update.
--
-- An authorized CRM operator may correct the amount of an existing eligible
-- DRAFT quote before acceptance.
--
-- Lock order is quote, then lead. This mirrors the acceptance RPC and must
-- never be inverted.
--
-- Evaluation order is deliberate:
--   lifecycle checks happen BEFORE same-value no-op handling, so an already
--   accepted quote fails lifecycle even when the requested amount equals the
--   current amount.

create or replace function public.update_draft_quote_amount(
  p_business_id uuid,
  p_quote_id uuid,
  p_expected_total_price numeric,
  p_total_price numeric
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
  v_activity public.activity_log%rowtype;
  v_previous_total_price numeric;
begin
  if p_business_id is null or p_quote_id is null then
    raise exception using errcode = '22023', message = 'business_id and quote_id are required';
  end if;

  -- The new amount is pure input validation and is intentionally performed
  -- before any database state is read. It is never silently rounded.
  if p_total_price is null
     or p_total_price::text in ('NaN', 'Infinity', '-Infinity')
     or p_total_price <= 0
     or p_total_price > 10000000
     or p_total_price <> round(p_total_price, 2)
  then
    return jsonb_build_object(
      'status', 'invalid_amount',
      'quote_id', p_quote_id
    );
  end if;

  -- The expected amount is the canonical amount displayed when the operator
  -- loaded the form. Historical zero/null values remain correctable.
  if p_expected_total_price is not null
     and (
       p_expected_total_price::text in ('NaN', 'Infinity', '-Infinity')
       or p_expected_total_price < 0
       or p_expected_total_price > 10000000
     )
  then
    return jsonb_build_object(
      'status', 'invalid_amount',
      'quote_id', p_quote_id
    );
  end if;

  -- Quote first, then lead. Never the reverse.
  select *
    into v_quote
    from public.quotes
   where business_id = p_business_id
     and id = p_quote_id
   for update;

  if not found then
    return jsonb_build_object(
      'status', 'not_found',
      'quote_id', p_quote_id
    );
  end if;

  select *
    into v_lead
    from public.leads
   where business_id = p_business_id
     and id = v_quote.lead_id
   for update;

  if not found then
    raise exception using errcode = '23503', message = 'Quote lead does not belong to the requested business';
  end if;

  select *
    into v_customer
    from public.customers
   where business_id = p_business_id
     and id = v_lead.customer_id;

  if not found then
    raise exception using errcode = '23503', message = 'Lead customer does not belong to the requested business';
  end if;

  -- Lifecycle checks must run before any no-op/conflict evaluation.
  if v_quote.status <> 'DRAFT' then
    return jsonb_build_object(
      'status', 'invalid_lifecycle',
      'quote_id', v_quote.id,
      'lead_id', v_lead.id,
      'total_price', v_quote.total_price
    );
  end if;

  if v_lead.lifecycle_status not in ('NEW', 'QUALIFIED', 'CONTACTED') then
    return jsonb_build_object(
      'status', 'invalid_lifecycle',
      'quote_id', v_quote.id,
      'lead_id', v_lead.id,
      'total_price', v_quote.total_price
    );
  end if;

  -- A DRAFT quote that already produced a job is non-editable. Holding the
  -- quote row lock prevents the acceptance RPC from creating that job
  -- concurrently, so a plain existence check is sufficient here.
  if exists (
    select 1
      from public.jobs
     where business_id = p_business_id
       and quote_id = v_quote.id
  ) then
    return jsonb_build_object(
      'status', 'invalid_lifecycle',
      'quote_id', v_quote.id,
      'lead_id', v_lead.id,
      'total_price', v_quote.total_price
    );
  end if;

  -- Same-value replay. No update, no activity.
  if v_quote.total_price is not distinct from p_total_price then
    return jsonb_build_object(
      'status', 'no_op',
      'quote_id', v_quote.id,
      'lead_id', v_lead.id,
      'total_price', v_quote.total_price,
      'no_op', true
    );
  end if;

  -- Stale screen: the amount changed since the operator loaded the form.
  -- No update, no activity.
  if v_quote.total_price is distinct from p_expected_total_price then
    return jsonb_build_object(
      'status', 'conflict',
      'quote_id', v_quote.id,
      'lead_id', v_lead.id,
      'total_price', v_quote.total_price
    );
  end if;

  v_previous_total_price := v_quote.total_price;

  update public.quotes
     set total_price = p_total_price
   where business_id = p_business_id
     and id = v_quote.id
  returning * into v_quote;

  if not found then
    raise exception using errcode = '40001', message = 'Quote amount could not be updated';
  end if;

  -- A failed activity insert aborts the transaction and rolls the amount
  -- update back with it.
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
    null,
    'quote.amount_updated',
    jsonb_build_object(
      'source', 'crm_quote_amount_ui',
      'quote_id', v_quote.id,
      'old_total_price', v_previous_total_price,
      'new_total_price', p_total_price
    )
  ) returning * into v_activity;

  return jsonb_build_object(
    'status', 'updated',
    'quote_id', v_quote.id,
    'lead_id', v_lead.id,
    'total_price', v_quote.total_price,
    'no_op', false
  );
end;
$$;

REVOKE EXECUTE ON FUNCTION public.update_draft_quote_amount(uuid, uuid, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_draft_quote_amount(uuid, uuid, numeric, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_draft_quote_amount(uuid, uuid, numeric, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_draft_quote_amount(uuid, uuid, numeric, numeric) TO service_role;

commit;
