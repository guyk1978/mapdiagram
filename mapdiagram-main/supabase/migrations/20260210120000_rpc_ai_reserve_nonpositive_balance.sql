-- Reject zero or negative balance explicitly (reserve path is server-only truth).
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
  if v_bal is null or coalesce (v_bal, 0) <= 0 or v_bal < p_reserved_credits then
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
