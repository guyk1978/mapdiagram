-- Run this in Supabase SQL editor
create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

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

create index if not exists idx_projects_user_updated
on public.projects(user_id, updated_at desc);

-- user_wallets (minimal): supabase/setup-projects-and-wallets.sql
-- Full AI billing (ledger, RPCs, Stripe): supabase/migrations/20260209120000_ai_credit_billing.sql
