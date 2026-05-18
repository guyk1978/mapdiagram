-- Hard cap per single credit grant (Stripe webhook, admin refund, mock purchase).
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
  v_cap constant bigint := 1000000;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'amount_must_be_positive');
  end if;
  if p_amount > v_cap then
    return jsonb_build_object('ok', false, 'error', 'amount_too_large', 'max', v_cap);
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
