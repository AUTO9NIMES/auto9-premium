begin;

alter table public.customers
  add column if not exists birth_date date;

alter table public.vehicles
  add column if not exists photo_path text;

do $verify$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'birth_date'
      and data_type = 'date'
  ) then
    raise exception '046 reconciliation: customers.birth_date is missing or has unexpected type'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'photo_path'
      and data_type = 'text'
  ) then
    raise exception '046 reconciliation: vehicles.photo_path is missing or has unexpected type'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'crm-vehicle-photos'
      and public = false
  ) then
    raise exception '046 reconciliation: crm-vehicle-photos must exist and remain private'
      using errcode = '23514';
  end if;
end;
$verify$;

commit;
