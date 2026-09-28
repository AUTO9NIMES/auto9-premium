"""Opt-in PostgreSQL 17 lab test; never invoked by the unit suite.
Run: python3 tests/sql/step373-monotone-updated-at.py /absolute/evidence/directory
Uses only the fixed STEP373 Unix socket/database, no Docker or remote connection.
Temporarily commits the candidate function for two-session tests, then restores it.
Append --fail-after-install to verify failure cleanup (expected process exit 1).
Append --fail-during-cleanup to verify restoration continues after a cleanup error.
"""
import json
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]).resolve()
OUT.mkdir(parents=True, exist_ok=True)
USER = subprocess.check_output(['id', '-un'], text=True).strip()
PSQL = ['/opt/homebrew/opt/postgresql@17/bin/psql', '-X', '-qAt',
        '-h', '/tmp/auto9-pg17-test.fSB4WBCt', '-p', '55479', '-U', USER,
        '-d', 'auto9_sql_lab', '-v', 'ON_ERROR_STOP=1']
ENV = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
ENV['PGAPPNAME'] = 'auto9_step373'
ENV['PGOPTIONS'] = '-c statement_timeout=15000 -c lock_timeout=10000 -c timezone=UTC'
SCHEMA = 'auto9_step373_' + uuid.uuid4().hex[:12]
BIZ = '00000000-0000-0000-0000-000000000001'
IDS = {key: str(uuid.uuid4()) for key in ['customer', 'lead', 'service']}
TRANSCRIPT = (OUT / 'laboratory-transcript.log').open('w')
SESSIONS = []
PASSED = []


def record(value):
    TRANSCRIPT.write(value + '\n'); TRANSCRIPT.flush()


def sql(value):
    record('SQL> ' + value)
    r = subprocess.run(PSQL, input=value, text=True, capture_output=True, env=ENV, timeout=25)
    record(r.stdout + r.stderr)
    if r.returncode:
        raise RuntimeError(r.stderr)
    return r.stdout.strip()


def literal(value):
    if value is None:
        return 'null'
    return "'" + str(value).replace("'", "''") + "'"


def passed(name):
    PASSED.append(name); print('PASS: ' + name, flush=True)


class Session:
    def __init__(self, tag):
        env = dict(ENV, PGAPPNAME='auto9_step373_' + tag)
        self.tag = tag
        self.proc = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                     stderr=subprocess.STDOUT, env=env, bufsize=0)
        self.buffer = b''; SESSIONS.append(self)

    def send(self, value):
        record(self.tag + ' SQL> ' + value)
        self.proc.stdin.write((value + '\n').encode())
        self.proc.stdin.flush()

    def until(self, marker):
        result = []; deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            while b'\n' in self.buffer:
                line, self.buffer = self.buffer.split(b'\n', 1)
                line = line.decode(); record(self.tag + ' < ' + line)
                if line == marker:
                    return result
                result.append(line)
            ready, _, _ = select.select([self.proc.stdout], [], [], 0.2)
            if ready:
                block = os.read(self.proc.stdout.fileno(), 65536)
                if not block:
                    raise RuntimeError(self.tag + ' exited: ' + '\n'.join(result))
                self.buffer += block
        raise RuntimeError(self.tag + ' timed out waiting for ' + marker)

    def run(self, value):
        marker = 'done_' + uuid.uuid4().hex
        self.send(value + "\nselect '" + marker + "';")
        return self.until(marker)

    def close(self):
        if self.proc.poll() is None:
            try:
                self.proc.stdin.close()
            except BrokenPipeError:
                pass
            try:
                self.proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    self.proc.kill(); self.proc.wait(timeout=3)


def fingerprint():
    return sql("select md5(pg_get_functiondef('public.set_updated_at()'::regprocedure));")


def state():
    return sql("""select jsonb_object_agg(table_name, rows) from (
      select c.relname table_name, (xpath('/table/row/data/text()',
        query_to_xml(format('select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text), ''[]''::jsonb) data from public.%I t', c.relname), false, true, '')))[1]::text rows
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r') s;""")


def catalog():
    return sql("""select jsonb_build_object(
      'functions', (select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
        'definition',pg_get_functiondef(p.oid),'owner',p.proowner,'acl',p.proacl) order by p.oid)
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.prokind='f'),
      'triggers', (select jsonb_agg(jsonb_build_object('definition',pg_get_triggerdef(t.oid),
        'enabled',t.tgenabled) order by t.oid) from pg_trigger t
        join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and not t.tgisinternal));""")


def snapshot():
    return json.loads(sql(f"""select jsonb_build_object('customer',to_jsonb(c),'lead',to_jsonb(l),'service',to_jsonb(s))
      from public.customers c join public.leads l on l.customer_id=c.id
      join public.lead_services s on s.lead_id=l.id where s.id='{IDS['service']}';"""))


def schedule(monotone):
    a = Session('early_A'); b = Session('late_B')
    try:
        a_start = a.run('begin; select transaction_timestamp();')[0]
        b_start = b.run('begin; select transaction_timestamp();')[0]
        b_value = b.run(f"update public.lead_services set service_name='STEP373_B' where id='{IDS['service']}' returning updated_at;")[0]
        b_commit = b.run('commit; select clock_timestamp();')[0]
        a_value = a.run(f"update public.lead_services set service_name='STEP373_A' where id='{IDS['service']}' returning updated_at;")[0]
        a_commit = a.run('commit; select clock_timestamp();')[0]
        op = '>' if monotone else '<'
        sql(f"""select {SCHEMA}.assert_true('{a_start}'::timestamptz < '{b_start}'::timestamptz, 'A started first');
          select {SCHEMA}.assert_true('{a_value}'::timestamptz {op} '{b_value}'::timestamptz, 'early A late write ordering');
          select {SCHEMA}.assert_true((select service_name='STEP373_A' and updated_at='{a_value}'::timestamptz from public.lead_services where id='{IDS['service']}'), 'final A row');""")
        result = dict(candidate=monotone, a_start=a_start, b_start=b_start, b_updated_at=b_value,
                      b_commit_observed=b_commit, a_updated_at=a_value, a_commit_observed=a_commit,
                      a_greater_than_b=monotone, final_service='STEP373_A')
        (OUT / ('candidate-timeline.json' if monotone else 'original-timeline.json')).write_text(json.dumps(result, indent=2))
        print(json.dumps(result), flush=True)
        passed('two real sessions: ' + ('strict increase' if monotone else 'baseline backward timestamp reproduced'))
    finally:
        a.close(); b.close()


def rpc_call(snap, atomic=False):
    c, l, s = [snap[key] for key in ['customer', 'lead', 'service']]
    if atomic:
        args = [BIZ, l['id'], l['updated_at'], c['updated_at'], l['created_at'], s['id'],
                s['updated_at'], s['service_name'], c['full_name'], c.get('first_name'), c.get('last_name'),
                c.get('email'), c.get('phone'), c.get('city'), 'STEP373_RPC', l.get('notes'), l['created_at']]
        return 'public.update_v2_dossier_atomically(' + ','.join(map(literal, args)) + ')'
    args = [BIZ, l['id'], s['id'], s['service_name'], s['updated_at'], 'STEP373_RPC', 'step373_lab']
    return 'public.update_lead_service_details(' + ','.join(map(literal, args)) + ')'


def conflict(atomic=False):
    snap = snapshot(); owner = Session('lock_owner'); waiter = Session('rpc_waiter')
    old_audit = sql(f"select count(*) from public.activity_log where lead_id='{IDS['lead']}';")
    try:
        owner.run(f"begin; select id from public.leads where id='{IDS['lead']}' for update; update public.lead_services set base_price=coalesce(base_price,0)+1 where id='{IDS['service']}';")
        marker = 'rpc_finished'
        waiter.send(f"begin; select {SCHEMA}.assert_true(({rpc_call(snap, atomic)})->>'status'='conflict','stale RPC must conflict'); commit; select '{marker}';")
        deadline = time.monotonic() + 8; observed = False
        while time.monotonic() < deadline:
            observed = sql("select count(*) from pg_stat_activity where application_name='auto9_step373_rpc_waiter' and wait_event_type='Lock';") == '1'
            if observed:
                break
            time.sleep(0.05)
        if not observed:
            raise AssertionError('Real lock wait was not observed')
        owner.run('commit;'); waiter.until(marker)
        current = snapshot()
        sql(f"select {SCHEMA}.assert_true((select count(*)={old_audit} from public.activity_log where lead_id='{IDS['lead']}'), 'conflict has no audit');")
        if current['service']['service_name'] != snap['service']['service_name']:
            raise AssertionError('Conflict wrote service label')
        passed(('atomic 17-argument' if atomic else 'historical service') + ' RPC waits then conflicts on timestamp-only service edit; no audit')
    finally:
        owner.close(); waiter.close()


def waiting_writer():
    owner = Session('row_owner'); waiter = Session('row_waiter')
    try:
        waiter.run('begin;')  # Earlier transaction writes second after waiting.
        first = owner.run(f"begin; update public.lead_services set service_name='STEP373_ROW_B' where id='{IDS['service']}' returning updated_at;")[0]
        waiter.send(f"update public.lead_services set service_name='STEP373_ROW_A' where id='{IDS['service']}' returning updated_at; commit; select 'row_done';")
        deadline = time.monotonic() + 8
        while sql("select count(*) from pg_stat_activity where application_name='auto9_step373_row_waiter' and wait_event_type='Lock';") != '1':
            if time.monotonic() > deadline:
                raise AssertionError('Direct row-lock wait not observed')
            time.sleep(0.05)
        owner.run('commit;'); second = waiter.until('row_done')[0]
        sql(f"select {SCHEMA}.assert_true('{second}'::timestamptz > '{first}'::timestamptz, 'waiting writer sees latest locked OLD version');")
        passed('direct UPDATE waits on row lock, then advances latest committed version')
    finally:
        owner.close(); waiter.close()


def rollback_and_tenant():
    snap = snapshot()
    for atomic in [False, True]:
        call = rpc_call(snap, atomic)
        wrong_tenant = call.replace(BIZ, 'ffffffff-ffff-4fff-8fff-ffffffffffff', 1)
        sql(f"select {SCHEMA}.assert_true(({wrong_tenant})->>'status'='not_found','foreign tenant cannot edit');")
        before_call = state()
        old_audit = sql(f"select count(*) from public.activity_log where lead_id='{IDS['lead']}';")
        sql(f"""begin;
          create function {SCHEMA}.reject_audit() returns trigger language plpgsql as $$
          begin if new.lead_id='{IDS['lead']}' then raise exception using errcode='P7373', message='injected late audit failure'; end if; return new; end; $$;
          create trigger step373_late_failure after insert on public.activity_log for each row execute function {SCHEMA}.reject_audit();
          do $$ declare rejected boolean := false; begin
            begin perform {call}; exception when sqlstate 'P7373' then rejected := true; end;
            perform {SCHEMA}.assert_true(rejected,'late audit failure must occur');
            perform {SCHEMA}.assert_true((select jsonb_build_object('customer',to_jsonb(c),'lead',to_jsonb(l),'service',to_jsonb(s))
              from public.customers c join public.leads l on l.customer_id=c.id
              join public.lead_services s on s.lead_id=l.id where s.id='{IDS['service']}') =
              {literal(json.dumps(snap))}::jsonb, 'subtransaction already restored all row versions before outer rollback');
            perform {SCHEMA}.assert_true((select count(*)={old_audit} from public.activity_log where lead_id='{IDS['lead']}'), 'failed audit insert rolled back');
          end; $$;
          rollback;""")
        if state() != before_call:
            raise AssertionError('Late failure leaked changes')
        passed(('atomic' if atomic else 'historical') + ' foreign-tenant denial and real late-audit rollback')


def interrupted(_sig, _frame):
    raise KeyboardInterrupt('Lab interrupted; restoring original function')


signal.signal(signal.SIGINT, interrupted)
signal.signal(signal.SIGTERM, interrupted)
original = None; before = None; catalog_before = None; setup = False; completed = False
try:
    identity = sql("select current_database()||'|'||current_setting('port')||'|'||coalesce(inet_server_addr()::text,'local');")
    if identity != 'auto9_sql_lab|55479|local':
        raise AssertionError('Wrong laboratory: ' + identity)
    if fingerprint() != '4d6804d5850641a33867814c9e76a714':
        raise AssertionError('Original function fingerprint differs')
    if sql("select count(*) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid();") != '0':
        raise AssertionError('Another lab session exists')
    fixture = {}
    for line in Path('/tmp/auto9-step366-fixture-ids.txt').read_text().splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            uuid.UUID(value); fixture[key] = value
    if fixture['business_id'] != BIZ:
        raise AssertionError('Fixture business differs')
    before = state(); (OUT / 'public-data-before.json').write_text(before)
    catalog_before = catalog(); (OUT / 'catalog-before.json').write_text(catalog_before)
    original = sql("select pg_get_functiondef('public.set_updated_at()'::regprocedure);") + ';\n'
    (OUT / 'restore-original.sql').write_text(original)
    setup = True
    sql(f"""begin; create schema {SCHEMA};
      create function {SCHEMA}.assert_true(ok boolean, label text) returns void language plpgsql as $$
        begin if ok is distinct from true then raise exception 'assertion failed: %',label; end if; end; $$;
      insert into public.customers select (jsonb_populate_record(null::public.customers,to_jsonb(c)||jsonb_build_object('id','{IDS['customer']}','idempotency_key',null,'email',null,'phone',null))).*
        from public.customers c where id='{fixture['customer_id']}';
      insert into public.leads select (jsonb_populate_record(null::public.leads,to_jsonb(l)||jsonb_build_object('id','{IDS['lead']}','customer_id','{IDS['customer']}','idempotency_key',null,'vehicle_id',null))).*
        from public.leads l where id='{fixture['lead_id']}';
      insert into public.lead_services select (jsonb_populate_record(null::public.lead_services,to_jsonb(s)||jsonb_build_object('id','{IDS['service']}','lead_id','{IDS['lead']}'))).*
        from public.lead_services s where id='{fixture['service_id']}';
      commit;""")
    snapshot()  # Must be a complete owned fixture, not zero-row assertions.
    schedule(False)
    candidate = (ROOT / 'supabase/migrations/20260928024642_monotone_updated_at.sql').read_text()
    sql(candidate)
    (OUT / 'candidate-function.md5').write_text(fingerprint())
    if '--fail-after-install' in sys.argv[2:]:
        raise RuntimeError('INTENTIONAL failure after candidate installation; exercise cleanup')
    schedule(True)
    sql((ROOT / 'tests/sql/step373-monotone-updated-at.sql').read_text())
    passed('SQL edge and eight-trigger binding matrix (see transcript for each assertion)')
    guard = candidate[candidate.index('do $guard$'):candidate.index('$guard$;') + len('$guard$;')]
    sql(f"""begin;
      create temporary table coarse_version(updated_at timestamptz(3));
      create trigger coarse before update on coarse_version for each row execute function public.set_updated_at();
      do $$ declare rejected boolean := false; begin
        begin execute {literal(guard)}; exception when invalid_parameter_value then rejected := true; end;
        perform {SCHEMA}.assert_true(rejected,'migration guard must reject millisecond column');
      end; $$;
      rollback;""")
    passed('migration deployment guard rejects an attached millisecond column')
    waiting_writer()
    conflict(False); conflict(True)
    rollback_and_tenant()
    # Successful update and exact replay/no_op still use their original RPCs.
    for atomic in [False, True]:
        snap = snapshot()
        # Ensure the requested label differs for this positive control.
        sql(f"update public.lead_services set service_name='STEP373_CONTROL' where id='{IDS['service']}';")
        snap = snapshot(); call = rpc_call(snap, atomic)
        audit_before = sql(f"select count(*) from public.activity_log where lead_id='{IDS['lead']}';")
        audit_ids = sql(f"select coalesce(array_agg(id),'{{}}'::uuid[]) from public.activity_log where lead_id='{IDS['lead']}';")
        sql(f"select {SCHEMA}.assert_true(({call})->>'status'='updated','RPC success');")
        expected_events = 2 if atomic else 1
        sql(f"""select {SCHEMA}.assert_true((select count(*)={audit_before}+{expected_events} from public.activity_log where lead_id='{IDS['lead']}'), 'exact successful audit count');
          select {SCHEMA}.assert_true(exists(select 1 from public.activity_log where lead_id='{IDS['lead']}'
            and id <> all({literal(audit_ids)}::uuid[])
            and business_id='{BIZ}' and customer_id='{IDS['customer']}' and event_type='lead.service_updated'
            and event_data->>'service_id'='{IDS['service']}' and event_data->>'previous_service_name'='STEP373_CONTROL'
            and event_data->>'new_service_name'='STEP373_RPC'), 'service audit identity and payload');""")
        fresh = snapshot()
        sql(f"select {SCHEMA}.assert_true(({rpc_call(fresh, atomic)})->>'status'='no_op','RPC replay no_op');")
        sql(f"select {SCHEMA}.assert_true(({call})->>'status'='conflict','old snapshot remains stale');")
        sql(f"select {SCHEMA}.assert_true((select count(*)={audit_before}+{expected_events} from public.activity_log where lead_id='{IDS['lead']}'), 'no_op and conflict produce no audit');")
        passed(('atomic' if atomic else 'historical') + ' updated/no_op/stale replay contract')
    completed = True
finally:
    cleanup_errors = []

    def cleanup_step(label, operation):
        try:
            return operation()
        except BaseException as error:
            cleanup_errors.append(label + ': ' + repr(error))
            record('CLEANUP ERROR: ' + cleanup_errors[-1])
            return None

    for session in SESSIONS:
        cleanup_step('close ' + session.tag, session.close)
    if '--fail-during-cleanup' in sys.argv[2:]:
        cleanup_step('injected close failure', lambda: (_ for _ in ()).throw(RuntimeError('INTENTIONAL cleanup error')))
    restored = None
    if original:
        # Restore before cleanup; CREATE OR REPLACE also restores function settings.
        cleanup_step('restore original function', lambda: sql(original))
        restored = cleanup_step('verify original fingerprint', fingerprint)
        if restored != '4d6804d5850641a33867814c9e76a714':
            cleanup_errors.append('ORIGINAL FUNCTION RESTORATION FAILED')
        else:
            (OUT / 'restored-function.md5').write_text(restored)
    if setup:
        cleanup_step('remove owned fixtures and schema', lambda: sql(f"""begin;
          delete from public.activity_log where lead_id='{IDS['lead']}';
          delete from public.lead_services where id='{IDS['service']}';
          delete from public.leads where id='{IDS['lead']}';
          delete from public.customer_identifiers where customer_id='{IDS['customer']}';
          delete from public.customers where id='{IDS['customer']}';
          drop schema if exists {SCHEMA} cascade;
          commit;"""))
    if before is not None:
        after = cleanup_step('read final data', state)
        if after is not None:
            (OUT / 'public-data-after.json').write_text(after)
        if after != before:
            cleanup_errors.append('LAB PUBLIC DATA WAS NOT RESTORED EXACTLY')
        else:
            passed('exact original public table content restored')
    if catalog_before is not None:
        catalog_after = cleanup_step('verify definitions and privileges', catalog)
        if catalog_after is not None:
            (OUT / 'catalog-after.json').write_text(catalog_after)
        if catalog_after != catalog_before:
            cleanup_errors.append('LAB FUNCTION/TRIGGER CATALOG WAS NOT RESTORED EXACTLY')
        else:
            passed('public function definitions, owners, ACLs and trigger bindings preserved')
    remaining = cleanup_step('verify sessions', lambda: sql("select count(*) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid();"))
    if remaining != '0':
        cleanup_errors.append('Unexpected sessions remain')
    record('CLEANUP COMPLETE' if not cleanup_errors else 'CLEANUP COMPLETED WITH ERRORS')
    (OUT / 'lab-results.json').write_text(json.dumps({'completed': completed,
        'passed': PASSED, 'restored_md5': restored, 'cleanup_errors': cleanup_errors}, indent=2))
    TRANSCRIPT.close()
    if cleanup_errors:
        raise RuntimeError('; '.join(cleanup_errors))
