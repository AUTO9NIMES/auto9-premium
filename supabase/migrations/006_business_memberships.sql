create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_id uuid not null,
  role text not null default 'member' check (role in ('member')),
  created_at timestamptz not null default now(),
  constraint fk_business_memberships_business
    foreign key (business_id) references public.businesses (id)
    on delete restrict
    on update cascade,
  constraint fk_business_memberships_user
    foreign key (user_id) references auth.users (id)
    on delete cascade
    on update cascade,
  constraint ux_business_memberships_business_user
    unique (business_id, user_id)
);

create index if not exists idx_business_memberships_user
  on public.business_memberships (user_id);

create index if not exists idx_business_memberships_business
  on public.business_memberships (business_id);

-- CRM authorization boundary: never reachable by anon/authenticated, server-side service-role access only.
revoke all on table public.business_memberships from public, anon, authenticated;
grant all on table public.business_memberships to service_role;

-- Codifies the verified production state; service_role has BYPASSRLS so this does not affect the DAL.
alter table public.business_memberships enable row level security;
