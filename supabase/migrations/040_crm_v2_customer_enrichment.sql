-- CRM V2 customer enrichment: birthdays and private vehicle photos
alter table public.customers
  add column if not exists birth_date date;

alter table public.vehicles
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-vehicle-photos',
  'crm-vehicle-photos',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
