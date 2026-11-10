begin;

-- Prospection commerciale (page CRM V2 « Développement »).
-- Les données ne sont accessibles qu'au serveur du CRM (service_role),
-- sur le modèle de crm_subscriptions (migration 045).

create table if not exists public.crm_prospects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  legal_name text check (legal_name is null or char_length(legal_name) <= 200),
  category text check (category is null or char_length(category) <= 80),
  address text check (address is null or char_length(address) <= 300),
  postal_code text check (postal_code is null or char_length(postal_code) <= 10),
  city text check (city is null or char_length(city) <= 120),
  distance_km numeric(6,1) check (distance_km is null or distance_km >= 0),
  headcount text check (headcount is null or char_length(headcount) <= 20),
  contact_name text check (contact_name is null or char_length(contact_name) <= 120),
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 200),
  website text check (website is null or char_length(website) <= 300),
  priority integer check (priority is null or priority > 0),
  status text not null default 'A_CONTACTER'
    check (status in (
      'A_CONTACTER','MAIL_ENVOYE','A_RELANCER','RDV_OBTENU',
      'ESSAI_PREVU','PARTENAIRE','SANS_SUITE','NE_PAS_CONTACTER'
    )),
  next_follow_up_on date,
  last_contacted_at timestamptz,
  contact_count integer not null default 0 check (contact_count >= 0),
  notes text check (notes is null or char_length(notes) <= 4000),
  source text check (source is null or char_length(source) <= 60),
  source_notes text check (source_notes is null or char_length(source_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_prospects_business_siret_key unique (business_id, siret)
);

create index if not exists crm_prospects_business_status_idx
  on public.crm_prospects (business_id, status, priority);

create index if not exists crm_prospects_business_follow_up_idx
  on public.crm_prospects (business_id, next_follow_up_on)
  where next_follow_up_on is not null;

create table if not exists public.crm_prospect_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prospect_id uuid not null references public.crm_prospects(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'IMPORTED','CREATED','MAIL_SENT','CALLED','FOLLOWED_UP',
      'STATUS_CHANGED','STOP','NOTE','EDITED'
    )),
  from_status text,
  to_status text,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists crm_prospect_events_prospect_idx
  on public.crm_prospect_events (prospect_id, created_at desc);

drop trigger if exists crm_prospects_set_updated_at on public.crm_prospects;
create trigger crm_prospects_set_updated_at
  before update on public.crm_prospects
  for each row execute function public.set_updated_at();

alter table public.crm_prospects enable row level security;
alter table public.crm_prospect_events enable row level security;

drop policy if exists crm_prospects_service_role_all on public.crm_prospects;
create policy crm_prospects_service_role_all
  on public.crm_prospects for all to service_role
  using (true) with check (true);

drop policy if exists crm_prospect_events_service_role_all on public.crm_prospect_events;
create policy crm_prospect_events_service_role_all
  on public.crm_prospect_events for all to service_role
  using (true) with check (true);

revoke all on table public.crm_prospects from anon, authenticated;
revoke all on table public.crm_prospect_events from anon, authenticated;
grant select, insert, update, delete on table public.crm_prospects to service_role;
grant select, insert, update, delete on table public.crm_prospect_events to service_role;

-- Import en lot : ajoute les nouveaux prospects, ne modifie jamais un prospect
-- existant (même SIRET, ou même nom + commune quand le SIRET est absent).
create or replace function public.crm_import_prospects(
  p_business_id uuid,
  p_rows jsonb,
  p_source text
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_inserted integer := 0;
begin
  if p_business_id is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'crm_import_prospects: invalid input';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception using errcode = '22023', message = 'crm_import_prospects: too many rows';
  end if;

  with incoming as (
    select distinct on (coalesce(r.siret, lower(btrim(r.name)) || '|' || lower(coalesce(r.city, ''))))
      r.*
    from jsonb_to_recordset(p_rows) as r(
      siret text, name text, legal_name text, category text, address text,
      postal_code text, city text, distance_km numeric, headcount text,
      contact_name text, phone text, email text, website text, priority integer,
      status text, next_follow_up_on date, notes text, source_notes text
    )
    where nullif(btrim(r.name), '') is not null
  ),
  inserted as (
    insert into public.crm_prospects (
      business_id, siret, name, legal_name, category, address, postal_code, city,
      distance_km, headcount, contact_name, phone, email, website, priority,
      status, next_follow_up_on, notes, source, source_notes
    )
    select
      p_business_id, nullif(i.siret, ''), btrim(i.name), i.legal_name, i.category,
      i.address, i.postal_code, i.city, i.distance_km, i.headcount, i.contact_name,
      nullif(i.phone, ''), nullif(i.email, ''), nullif(i.website, ''), i.priority,
      coalesce(nullif(i.status, ''), 'A_CONTACTER'), i.next_follow_up_on,
      nullif(i.notes, ''), p_source, nullif(i.source_notes, '')
    from incoming i
    where i.siret is not null
       or not exists (
         select 1 from public.crm_prospects p
          where p.business_id = p_business_id
            and p.siret is null
            and lower(btrim(p.name)) = lower(btrim(i.name))
            and lower(coalesce(p.city, '')) = lower(coalesce(i.city, ''))
       )
    on conflict on constraint crm_prospects_business_siret_key do nothing
    returning id
  ),
  logged as (
    insert into public.crm_prospect_events (business_id, prospect_id, event_type, note)
    select p_business_id, id, 'IMPORTED', p_source from inserted
    returning 1
  )
  select count(*) into v_inserted from logged;

  return v_inserted;
end;
$$;

-- Action de prospection : met à jour le prospect et écrit l'historique
-- dans la même transaction. Le statut et la relance sont calculés par l'app.
create or replace function public.crm_prospect_apply_action(
  p_business_id uuid,
  p_prospect_id uuid,
  p_event_type text,
  p_status text,
  p_next_follow_up_on date,
  p_clear_follow_up boolean,
  p_counts_as_contact boolean,
  p_note text
)
returns public.crm_prospects
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_before public.crm_prospects;
  v_after public.crm_prospects;
begin
  select * into v_before
    from public.crm_prospects
   where id = p_prospect_id and business_id = p_business_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'crm_prospect_apply_action: prospect not found';
  end if;

  update public.crm_prospects
     set status = coalesce(p_status, status),
         next_follow_up_on = case
           when p_clear_follow_up then null
           when p_next_follow_up_on is not null then p_next_follow_up_on
           else next_follow_up_on
         end,
         contact_count = contact_count + case when p_counts_as_contact then 1 else 0 end,
         last_contacted_at = case when p_counts_as_contact then now() else last_contacted_at end
   where id = p_prospect_id and business_id = p_business_id
   returning * into v_after;

  insert into public.crm_prospect_events (
    business_id, prospect_id, event_type, from_status, to_status, note
  ) values (
    p_business_id, p_prospect_id, p_event_type, v_before.status, v_after.status,
    nullif(btrim(coalesce(p_note, '')), '')
  );

  return v_after;
end;
$$;

revoke all on function public.crm_import_prospects(uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.crm_import_prospects(uuid, jsonb, text)
  to service_role;

revoke all on function public.crm_prospect_apply_action(uuid, uuid, text, text, date, boolean, boolean, text)
  from public, anon, authenticated;
grant execute on function public.crm_prospect_apply_action(uuid, uuid, text, text, date, boolean, boolean, text)
  to service_role;

commit;
