begin;

do $$
declare
  role_constraint_name text;
  role_constraint_count integer;
begin
  select
    min(c.conname),
    count(*)::integer
  into
    role_constraint_name,
    role_constraint_count
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class t
    on t.oid = c.conrelid
  join pg_catalog.pg_namespace n
    on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'business_memberships'
    and c.contype = 'c'
    and pg_catalog.pg_get_constraintdef(c.oid) ~ '\mrole\M';

  if role_constraint_count <> 1 or role_constraint_name is null then
    raise exception
      'Expected exactly one role CHECK constraint on public.business_memberships, found %',
      role_constraint_count;
  end if;

  execute format(
    'alter table public.business_memberships drop constraint %I',
    role_constraint_name
  );
end
$$;

alter table public.business_memberships
  add constraint business_memberships_role_check
  check (role in ('member', 'owner', 'operator'));

commit;
