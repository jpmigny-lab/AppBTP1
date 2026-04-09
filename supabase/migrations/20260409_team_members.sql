create extension if not exists pgcrypto;

-- Profils patrons (inscription + slug public pour /team-login/:slug).
-- Cette table n’existait pas dans les migrations précédentes du dépôt.
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  owner_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Colonnes manquantes si une vieille table existait déjà sans ces champs
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists owner_slug text;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_user_profiles_owner_slug_unique
  on public.user_profiles (owner_slug)
  where owner_slug is not null;

-- Membres d'équipe (sécurisé: hash + index déterministe)
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  owner_slug text not null,
  name text not null,
  role text not null default 'Employe',
  email text not null,
  phone text null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  access_code_hash text not null default '',
  access_code_index text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_members
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.team_members
  add column if not exists owner_slug text;
alter table public.team_members
  add column if not exists access_code_hash text;
alter table public.team_members
  add column if not exists access_code_index text;
alter table public.team_members
  add column if not exists status text;
alter table public.team_members
  add column if not exists created_at timestamptz default now();
alter table public.team_members
  add column if not exists updated_at timestamptz default now();

-- rétrocompat: user_id -> owner_user_id si présent
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'team_members' and column_name = 'user_id'
  ) then
    execute 'update public.team_members set owner_user_id = coalesce(owner_user_id, user_id) where owner_user_id is null';
  end if;
end $$;

create unique index if not exists idx_team_members_owner_code_unique
  on public.team_members(owner_user_id, access_code_index);

create unique index if not exists idx_team_members_slug_code_unique
  on public.team_members(owner_slug, access_code_index);

create index if not exists idx_team_members_owner on public.team_members(owner_user_id);
create index if not exists idx_team_members_slug on public.team_members(owner_slug);

-- Permissions par fonctionnalité
create table if not exists public.team_member_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  feature_key text not null,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_member_id, feature_key)
);

create index if not exists idx_team_member_permissions_owner on public.team_member_permissions(owner_user_id);
create index if not exists idx_team_member_permissions_member on public.team_member_permissions(team_member_id);

-- Assignations de chantiers
create table if not exists public.team_member_chantiers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  chantier_id text not null references public.app_chantiers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(team_member_id, chantier_id)
);

create index if not exists idx_team_member_chantiers_owner on public.team_member_chantiers(owner_user_id);
create index if not exists idx_team_member_chantiers_member on public.team_member_chantiers(team_member_id);
create index if not exists idx_team_member_chantiers_chantier on public.team_member_chantiers(chantier_id);

-- Sessions membres (backend only)
create table if not exists public.team_member_sessions (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  session_token text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_member_sessions_member on public.team_member_sessions(team_member_id);
create index if not exists idx_team_member_sessions_token on public.team_member_sessions(session_token);
create index if not exists idx_team_member_sessions_expires on public.team_member_sessions(expires_at);

-- RLS
alter table public.team_members enable row level security;
alter table public.team_member_permissions enable row level security;
alter table public.team_member_chantiers enable row level security;
alter table public.team_member_sessions enable row level security;

drop policy if exists team_members_owner_rw on public.team_members;
create policy team_members_owner_rw on public.team_members
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists team_member_permissions_owner_rw on public.team_member_permissions;
create policy team_member_permissions_owner_rw on public.team_member_permissions
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists team_member_chantiers_owner_rw on public.team_member_chantiers;
create policy team_member_chantiers_owner_rw on public.team_member_chantiers
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- sessions: pas d'accès client (service role uniquement)
drop policy if exists team_member_sessions_deny_all on public.team_member_sessions;
create policy team_member_sessions_deny_all on public.team_member_sessions
  for all using (false) with check (false);
