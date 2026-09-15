create or replace function public.mark_quote_as_sent(
  p_business_id uuid,
  p_quote_id uuid,
  p_source text default 'internal'
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_quote public.quotes%rowtype;
  v_activity public.activity_log%rowtype;
  v_source text := coalesce(nullif(trim(p_source), ''), 'internal');
begin
  if p_business_id is null or p_quote_id is null then
    raise exception using errcode = '22023', message = 'business_id and quote_id are required';
  end if;

  select *
    into v_quote
    from public.quotes
   where business_id = p_business_id
     and id = p_quote_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Quote not found for the requested business';
  end if;

  if v_quote.status = 'SENT' then
    return jsonb_build_object(
      'quote', to_jsonb(v_quote),
      'activity', null,
      'no_op', true
    );
  end if;

  if v_quote.status <> 'DRAFT' then
    raise exception using
      errcode = '23514',
      message = format('Quote status %s cannot be marked as sent', v_quote.status);
  end if;

  update public.quotes
     set status = 'SENT'
   where business_id = p_business_id
     and id = p_quote_id
     and status = 'DRAFT'
  returning * into v_quote;

  if not found then
    raise exception using errcode = '40001', message = 'Quote could not be marked as sent';
  end if;

  insert into public.activity_log (
    business_id,
    lead_id,
    event_type,
    event_data
  ) values (
    p_business_id,
    v_quote.lead_id,
    'quote.sent',
    jsonb_build_object(
      'source', v_source,
      'quote_id', v_quote.id
    )
  )
  returning * into v_activity;

  return jsonb_build_object(
    'quote', to_jsonb(v_quote),
    'activity', to_jsonb(v_activity),
    'no_op', false
  );
end;
$$;

revoke all on function public.mark_quote_as_sent(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.mark_quote_as_sent(uuid, uuid, text)
  to service_role;
