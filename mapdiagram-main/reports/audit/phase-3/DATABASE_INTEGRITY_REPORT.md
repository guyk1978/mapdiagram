# Phase 3 — Database & Migration Integrity Report

**Scope:** `supabase/migrations/**` (static SQL review only — **no live DB queries**).

**Files reviewed:**  
`20260209120000_ai_credit_billing.sql`, `20260210120000_rpc_ai_reserve_nonpositive_balance.sql`, `20260211120000_cap_rpc_add_credits_amount.sql`, `20260515120000_public_flowcharts.sql`

---

## Schema Integrity Findings

### DB-1 — Billing ledger append-only design

- **Severity:** Positive pattern  
- **Confidence:** High  
- **Evidence:** `credit_transactions` rows + `balance_after` snapshot (`20260209120000` ~16–25, ~468).  
- **Note:** Integrity depends on **only** SECURITY DEFINER RPCs mutating wallets — RLS denies client mutation (~92–105).

### DB-2 — `ai_usage_logs` unique `(user_id, idempotency_key)`

- **Severity:** Positive  
- **Confidence:** High  
- **Evidence:** ~43–44  
- **Impact:** Supports AI retry semantics without duplicate reserves.

### DB-3 — `public_flowcharts.data` unconstrained JSONB

- **Severity:** High (contract)  
- **Confidence:** High  
- **Evidence:** `20260515120000_public_flowcharts.sql` ~7  
- **Impact:** DB cannot enforce diagram validity; junk payloads accepted if Edge validation weak.  
- **Remediation:** `CHECK (jsonb_typeof(data) = 'object')`, optional `jsonb_matches_schema` (PG extension) or application validator before insert only (already partially there).

### DB-4 — Trigger `EXECUTE FUNCTION` naming

- **Severity:** Low  
- **Confidence:** Medium  
- **File:** `20260515120000_public_flowcharts.sql` ~33  
- **Evidence:** `EXECUTE FUNCTION public.touch_public_flowchart_updated_at()` — correct for PostgreSQL 14+ (Supabase typical). Older clusters would fail migration — **environment assumption**.

---

## Migration Safety Report

| Aspect | Assessment |
|--------|------------|
| Idempotent extensions | `create extension if not exists pgcrypto` — OK |
| Table creation | `if not exists` on billing tables — OK |
| Policy churn | `drop policy if exists` before create — OK |
| Function replace | `create or replace function` — **destructive** if dependency contracts change between migrations |
| Ordering | Later migrations patch `rpc_ai_reserve`, `rpc_add_credits` — **must apply in timestamp order** |

### DB-5 — Migration replaces core RPC semantics

- **Severity:** Medium (operational)  
- **Confidence:** High  
- **Evidence:** `20260210120000` replaces entire `rpc_ai_reserve`; `20260211120000` replaces `rpc_add_credits` cap.  
- **Impact:** Drift between deployed DB and docs if selective migrations applied.  
- **Remediation:** Single source migrations folder always applied wholesale in CI/CD.

---

## Index Recommendation Table

| Table | Existing | Recommendation |
|-------|----------|----------------|
| `credit_transactions` | `(user_id, created_at desc)` | Adequate for user history |
| `ai_usage_logs` | `(user_id, created_at desc)` | Consider `(user_id, idempotency_key)` — already UNIQUE implies btree backing unique constraint |
| `public_flowcharts` | `slug`, `user_id`, `created_at` | Adequate for lookup patterns |
| `stripe_processed_events` | PK `id` | — |

---

## RLS / Permission Assumptions

### DB-6 — Billing tables: client mutation denied

- **Severity:** Positive  
- **Confidence:** High  
- **Evidence:** Policies `*_no_client_mut` using `using (false)` (~92–105).  
- **Assumption:** All writes go through Edge service role — verified in AI + Stripe paths.

### DB-7 — `public_flowcharts` authenticated owner policy

- **Severity:** Medium  
- **Confidence:** High  
- **Evidence:** `FOR ALL TO authenticated USING (user_id = auth.uid())` (~38–43).  
- **Impact:** Edge INSERT uses **service role**, not subject to RLS — OK. Direct client inserts would require authenticated policy — editors appear to use Edge POST only (**Not verified** for alternate code paths).

### DB-8 — Anon SELECT on `public_flowcharts`

- **Severity:** Medium  
- **Confidence:** High  
- **Evidence:** `FOR SELECT TO anon USING (slug IS NOT NULL)` (~46–50).  
- **Impact:** Any row with non-null slug is world-readable via PostgREST if anon key used — **data exposure surface** wider than Edge GET (which increments counters). Prefer relying on Edge-only reads or tighten USING clause if slug entropy insufficient.

---

## Data Corruption Risk Areas

| Risk | Severity | Notes |
|------|----------|-------|
| Wallet negative clamp via `greatest(0, credits + delta)` in admin adjust (`20260209120000` ~446) | Low | Negative deltas can zero wallet — intentional |
| **`rpc_ai_reserve` increments rate bucket before balance check** | Medium | Both migration versions increment/minute bucket (~54–58 in patch, ~197–201 original) **before** insufficient-credits exit — consumes RPM slot even when balance fails |
| Non-transactional Stripe webhook side effects | **Critical** | See `EDGE_FUNCTIONS_AUDIT.md` EF-5 — application-layer double credit |

---

## Soft-delete / retention

- No soft-delete columns on `public_flowcharts` — immutability comment in migration (~52); GDPR/right-to-delete would need operational purge scripts (**Not defined in migrations**).

---

## Limitations

- Cannot verify production indexes vs migrations (`CREATE INDEX CONCURRENTLY` not used — locking risk on huge tables during deploy).  
- Cannot verify FK cascades against live auth.users population.
