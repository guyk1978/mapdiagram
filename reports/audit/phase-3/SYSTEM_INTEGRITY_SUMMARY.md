# Phase 3 — System Integrity Summary

Holistic evaluation after compiler, contract, Edge, database, resilience, and observability audits (`reports/audit/phase-3/*.md`).

---

## Top Systemic Risks

| Rank | Risk | Severity | Why it matters |
|------|------|----------|----------------|
| 1 | **Stripe webhook fulfillment path** | **Critical** | On `rpc_add_credits` failure the handler returns **HTTP 200** and Stripe likely **will not retry** → paid orders without credits; separate failure mode previously noted as duplicate-grant if retries occur without row-level idempotency (`OBSERVABILITY_REPORT.md` OB-5, `EDGE_FUNCTIONS_AUDIT.md` EF-5). |
| 2 | **Publish / public payload validation** | **High** | Edge accepts coarse-grained JSON; integrity + XSS burden shifts to renderer (`DATA_CONTRACT_AUDIT.md` DC-1, EF-1). |
| 3 | **Trust boundaries on shared diagrams** | **High** | Anonymous GET exposes full JSON; iframe viewer executes rich editor (`view.html` → `tool.html?publicView=`). |
| 4 | **Compiler bypass assumptions** | **High** | `compileFlowchartToCanvas` uses non-null assertions (`COMPILER_AUDIT_REPORT.md` C-1). |
| 5 | **Quality / indexing drift** | **Medium** | Server `qualityScore` ≠ TS `qualityScoreFlowchart` (`DATA_CONTRACT_AUDIT.md` DC-2). |

---

## Most Fragile Subsystems

1. **Stripe ↔ wallet ledger** — Minimal idempotency coupling at application layer; observability gaps (silent returns).  
2. **Published snapshot ↔ viewer** — Schema implicit; sessionStorage cache adds staleness/tampering surface (`DATA_CONTRACT_AUDIT.md` DC-3).  
3. **AI normalize → validate** — Heuristic graph surgery (`autoMarkBackEdges`) can change semantics before strict validation (`COMPILER_AUDIT_REPORT.md` C-3).

---

## Highest Operational Risks

- **Webhook silent failure + false success ACK** — Revenue operations blind spot (`OBSERVABILITY_REPORT.md` OB-5).  
- **`rpc_ai_reserve` rate bucket consumption before balance denial** — Users lose RPM quota on failed attempts (`DATABASE_INTEGRITY_REPORT.md`).  
- **Bundle drift** — `src/flowchart` tests green while `app/flowchart-compiler.js` stale (`COMPILER_AUDIT_REPORT.md` C-4).

---

## Most Dangerous Hidden Assumptions

| Assumption | Reality |
|------------|---------|
| “Stripe webhook errors trigger retries” | Handler returns **200** even when credits RPC fails → **no automatic retry**. |
| “Publish GET validates diagram” | Only counts/size — **structure trusted**. |
| “Compiler bundle matches Git HEAD” | Requires explicit **`npm run build:flowchart`**. |
| “Quality score is single definition” | Duplicated logic server vs client. |

---

## Priority Refactor Targets

1. **Transactional/idempotent credit grant** — `(event_id)` uniqueness + upsert semantics at DB layer; webhook returns **5xx** on failure after Stripe verified event (with care for duplicates — idempotent RPC).  
2. **`PublishSnapshotV1` validator** — Shared between `FlowchartProduct.buildSnapshot`, Edge POST, bootstrap viewer.  
3. **Stripe observability** — Metric + alert on `rpc_add_credits` failure path; dead-letter storage.  
4. **Compiler defensive layer** — Preconditions inside `compileFlowchartToCanvas` or branded `ValidatedFlowchartSpec` type.  
5. **Unify quality scoring** — Single implementation vendored into Edge.

---

## Production Readiness Assessment

| Area | Status | Notes |
|------|--------|-------|
| AI billing reserve/finalize/refund | **Strong** | RPC chain + retries on finalize (`ai-complete`) |
| Payments reconciliation | **Weak** | Webhook acknowledgment semantics broken on RPC failure |
| Public sharing scale | **Moderate** | JSON cap 512KB; slug entropy OK; view_count increment naive |
| Compiler correctness | **Good** | Solid validation suite (`tests/flowchart/compiler.test.ts`) |
| End-to-end contract discipline | **Weak** | Publish path underspecified vs FlowchartSpec |

**Overall:** The system shows **thoughtful AI billing design** and **rigorous FlowchartSpec validation**, but **production financial integrity depends critically on fixing Stripe webhook behavior** and tightening **publish/schema contracts**. Until then, integrity posture is **conditional**, not assured.

---

## Cross-reference index

| Report | Focus |
|--------|--------|
| `COMPILER_AUDIT_REPORT.md` | Parser, normalize, layout, compile, determinism |
| `DATA_CONTRACT_AUDIT.md` | Boundaries, drift, validation holes |
| `EDGE_FUNCTIONS_AUDIT.md` | Auth, public exposure, Stripe/AI |
| `DATABASE_INTEGRITY_REPORT.md` | RLS, RPC, indexes, corruption angles |
| `FAILURE_RESILIENCE_REPORT.md` | Scenario matrix, collisions |
| `OBSERVABILITY_REPORT.md` | Logs, silent failures, instrumentation |

---

## Phase 4 charter (recommended)

1. Implement Stripe webhook **hard correctness**: idempotent credit grant + appropriate HTTP status / Stripe retry policy.  
2. Add **publish schema validator** + regression tests for viewer bootstrap.  
3. **Fuzz** `extractJsonObject` + dagre layout on randomized valid graphs.  
4. Wire **distributed tracing** id through AI + publish flows.
