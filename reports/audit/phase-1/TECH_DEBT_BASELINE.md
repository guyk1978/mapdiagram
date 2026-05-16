# Phase 1 — Technical Debt Baseline

**Evidence:** Repository structure, measured LOC, tooling gaps (see BUILD_AND_TOOLING_REPORT), grep counts.

---

## 1. Largest files (maintenance cost drivers)

| Rank | Path | Approx LOC | Severity |
|------|------|------------|----------|
| 1 | [`app/tool.html`](../../../app/tool.html) | **~14,527** | **Critical** |
| 2 | `app/flowchart-compiler.js.map` | ~594 KB | Low (artifact) |
| 3 | [`src/flowchart/flowchart-spec.ts`](../../../src/flowchart/flowchart-spec.ts) | ~313 | Medium |
| 4 | [`src/flowchart/flowchart-beautify.ts`](../../../src/flowchart/flowchart-beautify.ts) | ~242 | Medium |
| 5 | [`src/flowchart/flowchart-normalize.ts`](../../../src/flowchart/flowchart-normalize.ts) | ~231 | Medium |

---

## 2. Complexity hotspots (approximate)

| Hotspot | Indicator | Severity |
|---------|-----------|----------|
| Editor inline script | ~11k lines contiguous | **Critical** |
| `runtime` object | 121 property accesses | **High** |
| History | `pushHistory` ×54 | **High** |
| Events | `addEventListener` ×100 | **High** |
| DOM mutation | innerHTML patterns ×31 | **Medium** |

---

## 3. Duplicated logic candidates

| Candidate A | Candidate B | Severity | Confidence |
|-------------|-------------|----------|------------|
| [`scripts/fc-interaction-engine.js`](../../../scripts/fc-interaction-engine.js) | Inlined flow group / pointer logic in `tool.html` | **Medium** | Low — needs diff; filenames suggest supersession |
| [`scripts/fc-interaction-slim.js`](../../../scripts/fc-interaction-slim.js) | Same | **Medium** | Low |

**Action:** Phase 2 trace import or verify dead files.

---

## 4. Dead / unused script candidates

| Path | Observation |
|------|-------------|
| `scripts/patch-*.mjs` | Maintenance patches — possibly **one-off** |
| `scripts/flow-group-*.js` | May duplicate inlined editor |

**Confidence:** Low without import graph — flag only.

---

## 5. Missing abstractions (symptoms)

| Symptom | Evidence |
|---------|----------|
| Business logic adjacent DOM | `tool.html` boot lines ~3834+ |
| Global singleton state | `runtime` bag ~3993 |
| Mixed networking layers | Supabase invoke + compiler AI fetch |

---

## 6. Outdated architecture signals

| Signal | Severity |
|--------|----------|
| Monolithic SPA-without-framework pattern | High |
| No CI workflows | High |
| TS tests bypass strict `tsc` | Medium |

---

## 7. Scalability blockers (engineering scalability)

| Blocker | Impact |
|---------|--------|
| Single-file editor | Team parallelization cost |
| No E2E harness | Regression risk on releases |
| Compiler+AI monolith coupling | Bundle size & security coupling |

---

## 8. Metrics summary table

| Metric | Value |
|--------|-------|
| Flowchart TS module files | 12 |
| Vitest tests | 38 |
| npm prod deps | 1 (`dagre`) |
| GitHub workflows | **0** detected |
| ESLint config | **Not present** |

---

## 9. Baseline scores (explicitly subjective — methodology)

Method: deduct from 10 based on objective gaps (CI=−2, monolith LOC>10k=−2, typecheck fail=−1, single test area=−1).

| Dimension | Score (/10) | Rationale |
|-----------|-------------|-----------|
| Maintainability | **4** | Monolith dominates |
| Testability | **5** | Strong compiler tests; zero editor automation |
| Operational maturity | **3** | No CI |
| Security observability | **5** | Edge + RLS unknown; surf map started |

---

## 10. Phase-2 measurement suggestions

1. Cyclomatic complexity sample on top 20 functions in `tool.html` (tooling).  
2. Bundle analyzer on `flowchart-compiler.js` for chunk reasons.  
3. `git grep` ownership map per directory.
