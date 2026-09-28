begin;

-- Optional business date for a lead's requested performance.
-- This is distinct from the technical creation timestamp.
-- No historical rows are rewritten or inferred from created_at.
alter table public.leads
  add column if not exists performance_date date;

comment on column public.leads.performance_date is
  'Optional business date of the requested service; independent of leads.created_at.';

commit;
