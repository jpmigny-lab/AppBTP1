create extension if not exists pgcrypto;

create table if not exists public.app_clients (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_chantiers (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  client_id text not null,
  client_name text not null,
  date_debut text not null,
  duree text not null,
  images text[] not null default '{}',
  statut text not null check (statut in ('planifié', 'en cours', 'terminé')),
  assigned_member_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_devis (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  statut text not null default 'brouillon',
  state_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_factures (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  statut text not null default 'brouillon',
  devis_source_id text null,
  state_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_crm_prospects (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, key)
);

create index if not exists idx_app_clients_owner on public.app_clients(owner_user_id);
create index if not exists idx_app_chantiers_owner on public.app_chantiers(owner_user_id);
create index if not exists idx_app_devis_owner on public.app_devis(owner_user_id);
create index if not exists idx_app_factures_owner on public.app_factures(owner_user_id);
create index if not exists idx_app_crm_owner on public.app_crm_prospects(owner_user_id);
create index if not exists idx_app_settings_owner on public.app_settings(owner_user_id);

alter table public.app_clients enable row level security;
alter table public.app_chantiers enable row level security;
alter table public.app_devis enable row level security;
alter table public.app_factures enable row level security;
alter table public.app_crm_prospects enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists app_clients_owner_rw on public.app_clients;
create policy app_clients_owner_rw on public.app_clients
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists app_chantiers_owner_rw on public.app_chantiers;
create policy app_chantiers_owner_rw on public.app_chantiers
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists app_devis_owner_rw on public.app_devis;
create policy app_devis_owner_rw on public.app_devis
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists app_factures_owner_rw on public.app_factures;
create policy app_factures_owner_rw on public.app_factures
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists app_crm_owner_rw on public.app_crm_prospects;
create policy app_crm_owner_rw on public.app_crm_prospects
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists app_settings_owner_rw on public.app_settings;
create policy app_settings_owner_rw on public.app_settings
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
