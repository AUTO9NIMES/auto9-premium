-- Safely delete a CRM customer only when no protected business history exists.
--
-- Protected:
--   leads
--   jobs
--   appointments
--   activity_log
--   crm_subscriptions
--
-- Disposable when the customer is otherwise safe to delete:
--   customer_identifiers
--   vehicles

create or replace function public.delete_customer_if_safe(
  p_business_id uuid,
  p_customer_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_business_id is null or p_customer_id is null then
    raise exception 'business_id and customer_id are required'
      using errcode = '22023';
  end if;

  perform 1
  from public.customers c
  where c.business_id = p_business_id
    and c.id = p_customer_id
  for update;

  if not found then
    return 'NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.leads l
    where l.business_id = p_business_id
      and l.customer_id = p_customer_id
  ) then
    return 'PROTECTED';
  end if;

  if exists (
    select 1
    from public.jobs j
    where j.business_id = p_business_id
      and j.customer_id = p_customer_id
  ) then
    return 'PROTECTED';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.business_id = p_business_id
      and a.customer_id = p_customer_id
  ) then
    return 'PROTECTED';
  end if;

  if exists (
    select 1
    from public.activity_log al
    where al.business_id = p_business_id
      and al.customer_id = p_customer_id
  ) then
    return 'PROTECTED';
  end if;

  if exists (
    select 1
    from public.crm_subscriptions s
    where s.business_id = p_business_id
      and s.customer_id = p_customer_id
  ) then
    return 'PROTECTED';
  end if;

  delete from public.customer_identifiers ci
  where ci.business_id = p_business_id
    and ci.customer_id = p_customer_id;

  delete from public.vehicles v
  where v.business_id = p_business_id
    and v.customer_id = p_customer_id;

  delete from public.customers c
  where c.business_id = p_business_id
    and c.id = p_customer_id;

  if not found then
    raise exception 'customer disappeared during deletion'
      using errcode = 'P0001';
  end if;

  return 'DELETED';
end;
$$;

revoke all on function public.delete_customer_if_safe(uuid, uuid) from public;
revoke all on function public.delete_customer_if_safe(uuid, uuid) from anon;
revoke all on function public.delete_customer_if_safe(uuid, uuid) from authenticated;

grant execute on function public.delete_customer_if_safe(uuid, uuid) to service_role;
