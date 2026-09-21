-- Calendar Ultra is server-operated through the service role.
-- RLS policies alone do not grant table privileges.

revoke all on table public.crm_calendar_events from anon;
revoke all on table public.crm_calendar_events from authenticated;

grant select, insert, update, delete
  on table public.crm_calendar_events
  to service_role;
