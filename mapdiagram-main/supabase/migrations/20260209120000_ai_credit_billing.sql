-- AI credit billing: wallets, append-only ledger, usage logs, RPCs (backend source of truth).
-- Apply in Supabase SQL editor or via CLI migrations.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits bigint not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount bigint not null,
  balance_after bigint not null,
  transaction_type text not null,
  reference_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_tx_user_created
  on public.credit_transactions (user_id, created_at desc);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null,
  model text not null,
  reserved_credits bigint not null check (reserved_credits > 0),
  charged_credits bigint,
  prompt_tokens int,
  completion_tokens int,
  status text not null check (status in ('reserved', 'completed', 'failed_refunded')),
  error_message text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (user_id, idempotency_key)
);

create index if not exists idx_ai_usage_user_created on public.ai_usage_logs (user_id, created_at desc);

create table if not exists public.ai_rate_buckets (
  user_id uuid not null references auth.users (id) on delete cascade,
  minute_bucket timestamptz not null,
  request_count int not null default 0,
  primary key (user_id, minute_bucket)
);

-- Stripe idempotency + customer mapping
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_processed_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.user_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_rate_buckets enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.stripe_processed_events enable row level security;

drop policy if exists "wallet_select_own" on public.user_wallets;
create policy "wallet_select_own" on public.user_wallets for select using (auth.uid () = user_id);

drop policy if exists "credit_tx_select_own" on public.credit_transactions;
create policy "credit_tx_select_own" on public.credit_transactions for select using (auth.uid () = user_id);

drop policy if exists "ai_logs_select_own" on public.ai_usage_logs;
create policy "ai_logs_select_own" on public.ai_usage_logs for select using (auth.uid () = user_id);

drop policy if exists "stripe_customer_select_own" on public.stripe_customers;
create policy "stripe_customer_select_own" on public.stripe_customers for select using (auth.uid () = user_id);

-- No client inserts/updates on billing tables (service role + SECURITY DEFINER only)

drop policy if exists "wallet_no_client_mut" on public.user_wallets;
create policy "wallet_no_client_mut" on public.user_wallets for all using (false);

drop policy if exists "credit_tx_no_client_mut" on public.credit_transactions;
create policy "credit_tx_no_client_mut" on public.credit_transactions for all using (false);

drop policy if exists "ai_logs_no_client_mut" on public.ai_usage_logs;
create policy "ai_logs_no_client_mut" on public.ai_usage_logs for all using (false);

drop policy if exists "rate_no_client" on public.ai_rate_buckets;
create policy "rate_no_client" on public.ai_rate_buckets for all using (false);

drop policy if exists "stripe_events_no_client" on public.stripe_processed_events;
create policy "stripe_events_no_client" on public.stripe_processed_events for all using (false);

-- ---------------------------------------------------------------------------
-- Signup: seed wallet (bonus credits)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user_wallet ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_wallets (user_id, credits)
  values (new.id, 25);
  insert into public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, meta)
  values (
    new.id,
    25,
    25,
    'signup_bonus',
    'signup',
    jsonb_build_object('source', 'auth.users')
  );
  return new;
exception
  when unique_violation then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_wallet on auth.users;
create trigger on_auth_user_created_wallet
  after insert on auth.users for each row
execute function public.handle_new_user_wallet ();

-- ---------------------------------------------------------------------------
-- RPC: reserve credits + rate limit (single transaction)
-- ---------------------------------------------------------------------------

create or replace function public.rpc_ai_reserve (
  p_user_id uuid,
  p_idempotency_key text,
  p_reserved_credits bigint,
  p_max_requests_per_minute int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc ('minute', now() at time zone 'utc');
  v_cnt int;
  v_bal bigint;
  v_existing public.ai_usage_logs%rowtype;
  v_log_id uuid;
begin
  if p_user_id is null or coalesce (length (p_idempotency_key), 0) < 8 then
    return jsonb_build_object('ok', false, 'error', 'invalid_args');
  end if;
  if p_reserved_credits < 1 or p_reserved_credits > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_reserve');
  end if;

  select * into v_existing from public.ai_usage_logs
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'ok', true,
      'reused', true,
      'log_id', v_existing.id,
      'status', v_existing.status,
      'reserved', v_existing.reserved_credits
    );
  end if;

  insert into public.user_wallets (user_id, credits)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select request_count into v_cnt
  from public.ai_rate_buckets
  where user_id = p_user_id and minute_bucket = v_bucket
  for update;
  if not FOUND then
    v_cnt := 0;
  end if;
  if coalesce (v_cnt, 0) >= p_max_requests_per_minute then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.ai_rate_buckets (user_id, minute_bucket, request_count)
  values (p_user_id, v_bucket, 1)
  on conflict (user_id, minute_bucket) do update
    set request_count = public.ai_rate_buckets.request_count + 1
  returning request_count into v_cnt;

  select credits into v_bal from public.user_wallets where user_id = p_user_id for update;
  if v_bal is null or v_bal < p_reserved_credits then
    return jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', coalesce (v_bal, 0));
  end if;

  update public.user_wallets
  set credits = credits - p_reserved_credits,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.ai_usage_logs (
    user_id, idempotency_key, model, reserved_credits, status
  ) values (
    p_user_id, p_idempotency_key, 'pending', p_reserved_credits, 'reserved'
  ) returning id into v_log_id;

  insert into public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, meta)
  values (
    p_user_id,
    -p_reserved_credits,
    (select credits from public.user_wallets where user_id = p_user_id),
    'ai_reserve',
    p_idempotency_key,
    jsonb_build_object ('log_id', v_log_id)
  );

  return jsonb_build_object(
    'ok', true,
    'reused', false,
    'log_id', v_log_id,
    'balance', (select credits from public.user_wallets where user_id = p_user_id)
  );
end;
$$;

revoke all on function public.rpc_ai_reserve (uuid, text, bigint, int) from public;
grant execute on function public.rpc_ai_reserve (uuid, text, bigint, int) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: finalize success — charge actual (<= reserved), refund remainder
-- ---------------------------------------------------------------------------

create or replace function public.rpc_ai_finalize_success (
  p_log_id uuid,
  p_user_id uuid,
  p_model text,
  p_prompt_tokens int,
  p_completion_tokens int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.ai_usage_logs%rowtype;
  v_reserved bigint;
  v_actual bigint;
  v_refund bigint;
  v_bal bigint;
begin
  select * into v_log from public.ai_usage_logs where id = p_log_id for update;
  if not found or v_log.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'log_not_found');
  end if;
  if v_log.status <> 'reserved' then
    return jsonb_build_object('ok', false, 'error', 'invalid_state', 'status', v_log.status);
  end if;

  v_reserved := v_log.reserved_credits;
  v_actual := greatest (
    1::bigint,
    least (
      v_reserved,
      1 + ((coalesce (p_prompt_tokens, 0) + coalesce (p_completion_tokens, 0)) / 500)::bigint
    )
  );
  v_refund := v_reserved - v_actual;

  update public.user_wallets
  set credits = credits + v_refund,
      updated_at = now()
  where user_id = p_user_id;

  update public.ai_usage_logs
  set model = p_model,
      charged_credits = v_actual,
      prompt_tokens = p_prompt_tokens,
      completion_tokens = p_completion_tokens,
      status = 'completed',
      finalized_at = now ()
  where id = p_log_id;

  if v_refund > 0 then
    insert into public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, meta)
    values (
      p_user_id,
      v_refund,
      (select credits from public.user_wallets where user_id = p_user_id),
      'ai_refund_unused',
      v_log.idempotency_key,
      jsonb_build_object ('log_id', p_log_id, 'reserved', v_reserved, 'charged', v_actual)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'charged', v_actual,
    'refunded', v_refund,
    'balance', (select credits from public.user_wallets where user_id = p_user_id)
  );
end;
$$;

revoke all on function public.rpc_ai_finalize_success (uuid, uuid, text, int, int) from public;
grant execute on function public.rpc_ai_finalize_success (uuid, uuid, text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: finalize failure — full refund of reserved credits
-- ---------------------------------------------------------------------------

create or replace function public.rpc_ai_finalize_failure (
  p_log_id uuid,
  p_user_id uuid,
  p_error text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.ai_usage_logs%rowtype;
  v_reserved bigint;
begin
  select * into v_log from public.ai_usage_logs where id = p_log_id for update;
  if not found or v_log.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'log_not_found');
  end if;
  if v_log.status <> 'reserved' then
    return jsonb_build_object('ok', true, 'note', 'already_finalized');
  end if;

  v_reserved := v_log.reserved_credits;

  update public.user_wallets
  set credits = credits + v_reserved,
      updated_at = now()
  where user_id = p_user_id;

  update public.ai_usage_logs
  set status = 'failed_refunded',
      error_message = left (coalesce (p_error, 'error'), 2000),
      charged_credits = 0,
      finalized_at = now ()
  where id = p_log_id;

  insert into public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, meta)
  values (
    p_user_id,
    v_reserved,
    (select credits from public.user_wallets where user_id = p_user_id),
    'ai_refund_failure',
    v_log.idempotency_key,
    jsonb_build_object ('log_id', p_log_id, 'error', left (coalesce (p_error, ''), 500))
  );

  return jsonb_build_object(
    'ok', true,
    'refunded', v_reserved,
    'balance', (select credits from public.user_wallets where user_id = p_user_id)
  );
end;
$$;

revoke all on function public.rpc_ai_finalize_failure (uuid, uuid, text) from public;
grant execute on function public.rpc_ai_finalize_failure (uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: add credits (Stripe webhook / admin) — always writes ledger
-- ---------------------------------------------------------------------------

create or replace function public.rpc_add_credits (
  p_user_id uuid,
  p_amount bigint,
  p_transaction_type text,
  p_reference_id text,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal bigint;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'amount_must_be_positive');
  end if;

  insert into public.user_wallets (user_id, credits)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.user_wallets
  set credits = credits + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning credits into v_bal;

  insert into public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, meta)
  values (p_user_id, p_amount, v_bal, p_transaction_type, p_reference_id, coalesce (p_meta, '{}'::jsonb));

  return jsonb_build_object('ok', true, 'balance', v_bal);
end;
$$;

revoke all on function public.rpc_add_credits (uuid, bigint, text, text, jsonb) from public;
grant execute on function public.rpc_add_credits (uuid, bigint, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: admin adjust (signed delta) + ledger — service_role only; Edge verifies admin secret
-- ---------------------------------------------------------------------------

create or replace function public.rpc_admin_adjust_credits (
  p_user_id uuid,
  p_delta bigint,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal bigint;
begin
  insert into public.user_wallets (user_id, credits)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.user_wallets
  set credits = greatest (0, credits + p_delta),
      updated_at = now()
  where user_id = p_user_id
  returning credits into v_bal;

  insert into public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, meta)
  values (
    p_user_id,
    p_delta,
    v_bal,
    'admin_adjust',
    'admin',
    jsonb_build_object ('reason', left (coalesce (p_reason, ''), 500))
  );

  return jsonb_build_object('ok', true, 'balance', v_bal);
end;
$$;

revoke all on function public.rpc_admin_adjust_credits (uuid, bigint, text) from public;
grant execute on function public.rpc_admin_adjust_credits (uuid, bigint, text) to service_role;

comment on table public.credit_transactions is 'Append-only economic ledger; balance_after is snapshot after each row.';
comment on table public.ai_usage_logs is 'Per OpenAI call: reserve then finalize or full failure refund.';
