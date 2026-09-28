begin;

-- Row-version timestamps require full PostgreSQL microsecond precision.
-- Fail before replacement if a deployed binding cannot preserve the increment.
do $guard$
begin
  if exists (
    select 1
      from pg_catalog.pg_trigger t
      left join pg_catalog.pg_attribute a
        on a.attrelid = t.tgrelid and a.attname = 'updated_at'
       and not a.attisdropped
     where t.tgfoid = 'public.set_updated_at()'::regprocedure
       and (t.tgtype <> 19 -- BEFORE UPDATE, FOR EACH ROW
            or a.attnum is null
            or a.atttypid <> 'timestamptz'::regtype
            or a.atttypmod not in (-1, 6))
  ) then
    raise exception using errcode = '22023',
      message = 'set_updated_at requires BEFORE ROW UPDATE and microsecond timestamptz';
  end if;
end;
$guard$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if tg_op <> 'UPDATE' or tg_when <> 'BEFORE' or tg_level <> 'ROW' then
    raise exception using errcode = '55000',
      message = 'set_updated_at supports only BEFORE ROW UPDATE';
  end if;

  -- Existing columns are NOT NULL; tolerate a legacy NULL version defensively.
  if old.updated_at is null then
    new.updated_at := clock_timestamp();
  elsif not isfinite(old.updated_at) then
    -- Infinity cannot serve as a strictly increasing finite row version.
    raise exception using errcode = '22008',
      message = 'set_updated_at requires a finite previous timestamp';
  else
    -- Row locks serialize updates of this row, including waiting writers.
    -- Ignore explicit NEW.updated_at, as the historical trigger already did.
    -- Overflow at the maximum finite timestamp raises 22008 and aborts the write.
    new.updated_at := greatest(
      clock_timestamp(), old.updated_at + interval '1 microsecond'
    );
  end if;

  -- A per-row version, NOT a global commit clock or an operational work date.
  return new;
end;
$function$;

commit;
