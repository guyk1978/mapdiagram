# Phase 3 — Observability & Debugging Audit

Static review of logging, traceability, and production debug gaps across compiler, Edge, client bridges.

---

## Observability Gaps

### OB-1 — No correlation IDs across AI pipeline

- **Severity:** Medium  
- **Confidence:** High  
- **Evidence:** `src/ai-service.ts` logs host/url lengths (~56–64); `ai-complete/index.ts` logs RPC attempts — **no shared request id** propagated from browser to Edge to DB row beyond idempotency key.  
- **Impact:** Debugging user-reported “lost credits” requires stitching timestamps manually.  
- **Remediation:** Accept `x-request-id` header; store on `ai_usage_logs` meta.

### OB-2 — Compiler logs only to `console.info`

- **Severity:** Low  
- **Confidence:** High  
- **File:** `src/flowchart/flowchart-retry.ts` ~19–27  
- **Evidence:** `[MapDiagram][FlowchartCompiler]` prefix — invisible in production unless log aggregation captures stdout (browser: devtools only).  
- **Impact:** Field failures invisible without reproduction.

### OB-3 — Stripe webhook silent failure after logging

- **Severity:** High  
- **Confidence:** High  
- **File:** `supabase/functions/stripe-webhook/index.ts` ~106–108  
- **Evidence:** `console.error("rpc_add_credits", error); return;` — **no alerting hook**.  
- **Impact:** Revenue/credits discrepancy discovered only via reconciliation lag.

### OB-4 — `public-flowchart` minimal structured logging

- **Severity:** Low  
- **Confidence:** High  
- **Evidence:** `console.error("fetch error", error)` / `"insert error"` (~103–104, ~164–165).  
- **Impact:** Hard to distinguish invalid slug storms vs DB outages.

---

## Logging Quality Report

| Location | Structure | Sensitive data risk |
|----------|-----------|---------------------|
| `ai-service.ts` | Semi-structured objects | Logs token **lengths**, not values — good |
| `ai-complete` | Mixed console.error strings | OpenAI error body truncated (~245) |
| Client `tool.html` | toast + indicators | Not systematically logged |

---

## Runtime Visibility Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Browser-only compiler telemetry | Medium | Cannot diagnose AI→canvas failures at scale |
| No metrics for publish validation rejects | Medium | Would signal abuse or client bugs |
| No health Edge for dependency checks | Low | Misconfiguration surfaces as user errors |

---

## Silent Failure Zones

1. **`stripe-webhook`** RPC failure → **no dead-letter queue**, no Stripe acknowledgment differentiation beyond HTTP 200 always returned after handler starts (`stripe-webhook/index.ts` ~58–63). Actually handler awaits `handleStripeEvent` — errors inside `rpc_add_credits` return **without throwing** → Stripe receives **200 OK** → **will not retry** for some failures — **worse than duplicate**: **lost credits**.  

---

### OB-5 — Webhook always returns 200 even when credit grant skipped/failed

- **Severity:** Critical  
- **Confidence:** High  
- **File:** `supabase/functions/stripe-webhook/index.ts`  
- **Lines:** ~58–63, ~106–108  
- **Evidence:**

```typescript
  await handleStripeEvent(event, supabaseUrl, serviceKey);

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
```

- Inside `handleStripeEvent`, when `rpc_add_credits` errors, function returns without throwing (~106–108).  
- **Impact:** Stripe marks event delivered; **no retry**; customer paid without credits unless ops intervenes.  
- **Remediation:** Return **non-2xx** or throw when monetary mutation fails so Stripe retries; combine with idempotent `rpc_add_credits`.

---

## Recommended Instrumentation Plan

| Area | Instrument | Owner |
|------|-------------|-------|
| Compiler | Span: parse → validate → layout → compile; counters for coerce path | Frontend |
| AI gateway | Trace id header; map to `ai_usage_logs.id` | Edge |
| Publish | Structured log `{ slug, user_id, node_count, outcome }` | Edge |
| Stripe | Metrics: processed, credited, clamped, **rpc_error** | Edge |
| Renderer | CSP violations + uncaught errors → beacon (**privacy review**) | Frontend |

---

## Limitations

- No access to Supabase dashboard metrics or Logflare configs in repo — actual prod observability may exceed codebase.
