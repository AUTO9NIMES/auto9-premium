begin;

-- CRM database security boundary hardening.
--
-- Architecture:
-- - CRM data access is server-side only.
-- - Browser roles (PUBLIC / anon / authenticated) receive no direct table access.
-- - Server-side CRM persistence uses service_role.
-- - No authenticated-user RLS policies are introduced here.
--
-- This migration also closes the historical tenant-integrity gap in
-- activity_log entity references.

-- ---------------------------------------------------------------------------
-- Preflight: refuse to harden activity_log if historical data already contains
-- orphaned or cross-tenant entity references. No data is silently repaired.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
      from public.activity_log a
      left join public.customers c
        on c.id = a.customer_id
     where a.customer_id is not null
       and (
         c.id is null
         or c.business_id <> a.business_id
       )
  ) then
    raise exception
      'activity_log preflight failed: orphaned or cross-tenant customer reference';
  end if;

  if exists (
    select 1
      from public.activity_log a
      left join public.leads l
        on l.id = a.lead_id
     where a.lead_id is not null
       and (
         l.id is null
         or l.business_id <> a.business_id
       )
  ) then
    raise exception
      'activity_log preflight failed: orphaned or cross-tenant lead reference';
  end if;

  if exists (
    select 1
      from public.activity_log a
      left join public.jobs j
        on j.id = a.job_id
     where a.job_id is not null
       and (
         j.id is null
         or j.business_id <> a.business_id
       )
  ) then
    raise exception
      'activity_log preflight failed: orphaned or cross-tenant job reference';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Explicit deny-by-default CRM table boundary.
--
-- RLS is enabled without browser policies. service_role remains the privileged
-- server-side database principal and bypasses RLS in the intended architecture.
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.customer_identifiers enable row level security;
alter table public.vehicles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_services enable row level security;
alter table public.quotes enable row level security;
alter table public.jobs enable row level security;
alter table public.activity_log enable row level security;

alter table public.appointments enable row level security;
alter table public.business_memberships enable row level security;
alter table public.payments enable row level security;
alter table public.review_requests enable row level security;
alter table public.automation_outbox enable row level security;

revoke all on table public.businesses from public, anon, authenticated;
revoke all on table public.customers from public, anon, authenticated;
revoke all on table public.customer_identifiers from public, anon, authenticated;
revoke all on table public.vehicles from public, anon, authenticated;
revoke all on table public.leads from public, anon, authenticated;
revoke all on table public.lead_services from public, anon, authenticated;
revoke all on table public.quotes from public, anon, authenticated;
revoke all on table public.jobs from public, anon, authenticated;
revoke all on table public.activity_log from public, anon, authenticated;
revoke all on table public.appointments from public, anon, authenticated;
revoke all on table public.business_memberships from public, anon, authenticated;
revoke all on table public.payments from public, anon, authenticated;
revoke all on table public.review_requests from public, anon, authenticated;
revoke all on table public.automation_outbox from public, anon, authenticated;

-- Preserve the existing least-privilege service_role grants established by
-- the domain migrations for appointments, memberships, payments,
-- review_requests and automation_outbox.
grant all on table public.businesses to service_role;
grant all on table public.customers to service_role;
grant all on table public.customer_identifiers to service_role;
grant all on table public.vehicles to service_role;
grant all on table public.leads to service_role;
grant all on table public.lead_services to service_role;
grant all on table public.quotes to service_role;
grant all on table public.jobs to service_role;
grant all on table public.activity_log to service_role;

-- ---------------------------------------------------------------------------
-- Tenant-safe activity_log entity references.
--
-- Preserve nullable entity references and historical ON DELETE SET NULL
-- semantics while ensuring that every non-null entity belongs to the same
-- business as the activity row.
-- ---------------------------------------------------------------------------

alter table public.activity_log
  drop constraint fk_activity_customer,
  drop constraint fk_activity_lead,
  drop constraint fk_activity_job;

alter table public.activity_log
  add constraint fk_activity_customer
    foreign key (business_id, customer_id)
    references public.customers (business_id, id)
    on delete set null (customer_id)
    on update cascade,
  add constraint fk_activity_lead
    foreign key (business_id, lead_id)
    references public.leads (business_id, id)
    on delete set null (lead_id)
    on update cascade,
  add constraint fk_activity_job
    foreign key (business_id, job_id)
    references public.jobs (business_id, id)
    on delete set null (job_id)
    on update cascade;

commit;
