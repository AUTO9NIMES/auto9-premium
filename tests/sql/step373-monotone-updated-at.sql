-- Executed only by the guarded local-laboratory harness. No persistent objects.
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'assertion failed: %',label; end if;
  raise notice 'PASS: %',label;
end;
$$;

select pg_temp.assert_true((select array_agg(c.relname::text order by c.relname) =
  array['appointments','businesses','customers','jobs','lead_services','leads','quotes','vehicles']
  from pg_trigger t join pg_class c on c.oid=t.tgrelid
  where t.tgfoid='public.set_updated_at()'::regprocedure), 'exactly eight original bindings');
select pg_temp.assert_true((select bool_and(t.tgtype=19 and t.tgenabled='O' and
  a.atttypid='timestamptz'::regtype and a.atttypmod in (-1,6) and a.attnotnull)
  from pg_trigger t join pg_attribute a on a.attrelid=t.tgrelid and a.attname='updated_at'
  where t.tgfoid='public.set_updated_at()'::regprocedure), 'all eight BEFORE UPDATE bindings support microsecond versions');
select pg_temp.assert_true((select not prosecdef and proconfig=array['search_path=pg_catalog']
  from pg_proc where oid='public.set_updated_at()'::regprocedure), 'invoker with restricted search path');

-- Exercise the exact type/function binding for each table without changing
-- protected operational/financial rows. Actual public service/customer/lead
-- writes and their RPCs are covered by the two-session harness separately.
do $$
declare r record; previous timestamptz; first_version timestamptz; second_version timestamptz;
begin
  for r in select c.relname,format_type(a.atttypid,a.atttypmod) column_type
    from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_attribute a on a.attrelid=c.oid and a.attname='updated_at'
    where t.tgfoid='public.set_updated_at()'::regprocedure order by c.relname
  loop
    execute format('create temporary table binding_%I (updated_at %s)',r.relname,r.column_type);
    execute format('create trigger touch before update on binding_%I for each row execute function public.set_updated_at()',r.relname);
    previous := '2100-01-01 00:00:00+00';
    execute format('insert into binding_%I values ($1)',r.relname) using previous;
    execute format('update binding_%I set updated_at=''2000-01-01'' returning updated_at',r.relname) into first_version;
    execute format('update binding_%I set updated_at=''infinity'' returning updated_at',r.relname) into second_version;
    perform pg_temp.assert_true(first_version=previous+interval '1 microsecond' and
      second_version=first_version+interval '1 microsecond', r.relname||': strict sequential increase, future old clock, explicit overrides');
  end loop;
end;
$$;

create temporary table edge_versions(id int primary key, updated_at timestamptz);
create trigger touch before update on edge_versions for each row execute function public.set_updated_at();
insert into edge_versions values (1,null),(2,'infinity'),(3,'-infinity'),
  (4,'294276-12-31 23:59:59.999999+00');
update edge_versions set updated_at=null where id=1;
select pg_temp.assert_true((select isfinite(updated_at) and updated_at>=transaction_timestamp() from edge_versions where id=1), 'NULL old version becomes finite wall clock');
do $$
declare k int; rejected boolean; old_value timestamptz;
begin
  for k in 2..4 loop
    rejected := false;
    select updated_at into old_value from edge_versions where id=k;
    begin
      update edge_versions set updated_at=null where id=k;
    exception when datetime_field_overflow then rejected := true;
    end;
    perform pg_temp.assert_true(rejected and (select updated_at=old_value from edge_versions where id=k),
      'nonfinite/max version rejected atomically: '||k);
  end loop;
end;
$$;

create temporary table bad_insert(updated_at timestamptz);
create trigger bad before insert on bad_insert for each row execute function public.set_updated_at();
do $$
declare rejected boolean := false;
begin
  begin insert into bad_insert values (now());
  exception when object_not_in_prerequisite_state then rejected := true;
  end;
  perform pg_temp.assert_true(rejected and not exists(select 1 from bad_insert), 'unsupported INSERT binding rejected');
end;
$$;
rollback;
