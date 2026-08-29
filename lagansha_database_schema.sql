-- ============================================================================
-- LAGANSHA MATRIMONIAL APP — DATABASE SCHEMA (Supabase / PostgreSQL)
-- ============================================================================
-- Run this whole file in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- It creates the "profiles" table with every column your app's code reads
-- and writes (see dbToLocal() and buildPayload() in the HTML), plus indexes,
-- Row Level Security policies, realtime, and a photo storage bucket.
-- ============================================================================

-- 1. Extension needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- 2. Main table
create table if not exists public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Basic info
  name                text not null,
  gender              text not null check (gender in ('Male', 'Female', 'Other')),
  dob                 date,
  age                 int check (age between 18 and 100),
  height              text,
  marital_status      text,
  religion            text,
  caste               text,
  mother_tongue       text,

  -- Education & career
  education           text,
  college             text,
  profession          text,
  company             text,
  income              text,
  work_location       text,

  -- Location
  current_city        text,
  state               text,

  -- Lifestyle & appearance
  complexion          text,
  diet                text,
  drinking            text,
  smoking             text,
  physical_status     text,
  body_type           text,

  -- Family
  father_profession   text,
  mother_profession   text,
  siblings            text,
  family_type         text,
  family_status       text,
  family_values       text,

  -- Astrology
  rashi               text,
  manglik             text,
  birth_time          text,
  birth_place         text,
  gothra              text,

  -- Free text
  about               text,
  expectations        text,

  -- Meta
  verified            boolean not null default false,
  image               text
);

-- 3. Keep updated_at fresh on every UPDATE
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 4. Helpful indexes for the filters your sidebar uses
create index if not exists idx_profiles_religion    on public.profiles (religion);
create index if not exists idx_profiles_city         on public.profiles (current_city);
create index if not exists idx_profiles_marital      on public.profiles (marital_status);
create index if not exists idx_profiles_age          on public.profiles (age);
create index if not exists idx_profiles_gender       on public.profiles (gender);
create index if not exists idx_profiles_created_at   on public.profiles (created_at desc);

-- 5. Row Level Security
-- Your app currently uses the public "anon" key directly with no login system,
-- so these policies allow anyone with the anon key to read/write — matching
-- how the app behaves today. Tighten this later if you add user accounts.
alter table public.profiles enable row level security;

drop policy if exists "Public can view profiles" on public.profiles;
create policy "Public can view profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Public can insert profiles" on public.profiles;
create policy "Public can insert profiles"
  on public.profiles for insert
  with check (true);

drop policy if exists "Public can update profiles" on public.profiles;
create policy "Public can update profiles"
  on public.profiles for update
  using (true)
  with check (true);

drop policy if exists "Public can delete profiles" on public.profiles;
create policy "Public can delete profiles"
  on public.profiles for delete
  using (true);

-- 6. Realtime — your app subscribes to INSERT/UPDATE/DELETE on this table
alter publication supabase_realtime add table public.profiles;

-- 7. Optional: storage bucket for profile photos.
-- Your current code stores photos as base64 text directly in the "image"
-- column (works, but bloats the table). If you'd rather use Supabase Storage,
-- uncomment the block below and switch uploadPhoto() to upload to this bucket.
-- insert into storage.buckets (id, name, public)
-- values ('profile-photos', 'profile-photos', true)
-- on conflict (id) do nothing;
--
-- create policy "Public read profile photos"
--   on storage.objects for select
--   using (bucket_id = 'profile-photos');
--
-- create policy "Public upload profile photos"
--   on storage.objects for insert
--   with check (bucket_id = 'profile-photos');

-- ============================================================================
-- DONE. Copy your Project URL and anon public key from
-- Supabase Dashboard -> Settings -> API into the SUPABASE_URL / SUPABASE_ANON_KEY
-- (or SU / SK) variables near the bottom of your HTML file.
-- ============================================================================
