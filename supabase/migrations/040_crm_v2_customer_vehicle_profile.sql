-- CRM V2 richer customer and vehicle profiles
alter table public.customers
  add column if not exists birth_date date;

alter table public.vehicles
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('crm-vehicle-photos', 'crm-vehicle-photos', true)
on conflict (id) do update set public = true;
