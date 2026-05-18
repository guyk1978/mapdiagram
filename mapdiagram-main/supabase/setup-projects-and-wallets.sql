-- MapDiagram core tables: projects + user_wallets
-- Run once in Supabase Dashboard → SQL Editor (safe to re-run).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- projects (cloud diagram storage)
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user_updated
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "users_select_own_projects" on public.projects;
create policy "users_select_own_projects"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_projects" on public.projects;
create policy "users_insert_own_projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_update_own_projects" on public.projects;
create policy "users_update_own_projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_delete_own_projects" on public.projects;
create policy "users_delete_own_projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_wallets (AI credits — read-only for clients)
-- ---------------------------------------------------------------------------

create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits bigint not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_wallets enable row level security;

drop policy if exists "wallet_select_own" on public.user_wallets;
create policy "wallet_select_own"
  on public.user_wallets for select
  using (auth.uid() = user_id);

drop policy if exists "wallet_no_client_mut" on public.user_wallets;
create policy "wallet_no_client_mut"
  on public.user_wallets for all
  using (false);

-- Seed wallet + signup bonus for new auth users
create or replace function public.handle_new_user_wallet ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_wallets (user_id, credits)
  values (new.id, 25)
  on conflict (user_id) do nothing;
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_wallet on auth.users;
create trigger on_auth_user_created_wallet
  after insert on auth.users
  for each row
  execute function public.handle_new_user_wallet ();
