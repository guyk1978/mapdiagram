# Phase 1 — Executive Summary (Infrastructure + Build + Monolith Discovery)

**Audit date:** 2026-05-16  
**Repository:** `C:\mapdiagram` (scoped per charter: `app/`, `src/flowchart/`, `tests/flowchart/`, Vite configs, `package.json`, `supabase/functions/`, `supabase/migrations/`)  
**Deliverables folder:** [`reports/audit/phase-1/`](.)

| Document | Purpose |
|----------|---------|
| [INFRASTRUCTURE_AUDIT.md](./INFRASTRUCTURE_AUDIT.md) | Trees, entry points, boundaries |
| [BUILD_AND_TOOLING_REPORT.md](./BUILD_AND_TOOLING_REPORT.md) | npm/Vite/Vitest/tsc results |
| [MONOLITH_DISCOVERY_REPORT.md](./MONOLITH_DISCOVERY_REPORT.md) | `tool.html` scale & zones |
| [COMPILER_BOUNDARY_REPORT.md](./COMPILER_BOUNDARY_REPORT.md) | Flowchart bundle & tests |
| [INITIAL_SECURITY_SURFACE.md](./INITIAL_SECURITY_SURFACE.md) | Threat table (initial) |
| [TECH_DEBT_BASELINE.md](./TECH_DEBT_BASELINE.md) | Size/coupling metrics |

**Prior art:** Sitewide marketing/static concerns remain in [`reports/audit-phase-1.md`](../../audit-phase-1.md) (different scope).

---

## Top 10 risks (prioritized)

| # | Risk | Severity | Confidence | Evidence pointer |
|---|------|----------|------------|------------------|
| 1 | Editor is a **~14.5k-line** `tool.html` monolith mixing UI, persistence, billing, AI | **Critical** | High | [MONOLITH_DISCOVERY_REPORT.md](./MONOLITH_DISCOVERY_REPORT.md) |
| 2 | **No CI workflows** → regressions ship silently | **High** | High | [BUILD_AND_TOOLING_REPORT.md](./BUILD_AND_TOOLING_REPORT.md) |
| 3 | Flowchart compiler bundle embeds **AI billing fetch** (`ai-service`) | **High** | High | [`src/flowchart/index.ts`](../../../src/flowchart/index.ts) L26; [COMPILER_BOUNDARY_REPORT.md](./COMPILER_BOUNDARY_REPORT.md) |
| 4 | `tsc --noEmit` **fails** on tests (Node typings) while Vitest passes | **High** | High | compiler.test.ts + [BUILD_AND_TOOLING_REPORT.md](./BUILD_AND_TOOLING_REPORT.md) |
| 5 | Parent shell `postMessage(..., "*")` theme sync | **High** | High | [`app/index.html`](../../../app/index.html) L35; [INITIAL_SECURITY_SURFACE.md](./INITIAL_SECURITY_SURFACE.md) T1 |
| 6 | **31** DOM `innerHTML` / `insertAdjacentHTML` sites in editor | **Medium** | High | [MONOLITH_DISCOVERY_REPORT.md](./MONOLITH_DISCOVERY_REPORT.md) |
| 7 | Edge functions use **CORS `*`** (common, but auth must be airtight) | **Medium** | High | `ai-complete`, `public-flowchart` headers |
| 8 | Lazy load dependency on **`window.FlowchartCompiler`** global | **Medium** | High | `tool.html` ~L7118 error string |
| 9 | Duplicate interaction script files in `scripts/` vs inlined editor | **Medium** | Low | [TECH_DEBT_BASELINE.md](./TECH_DEBT_BASELINE.md) |
| 10 | `emptyOutDir: false` on Vite → **stale `app/` artifacts** risk | **Low** | High | [`vite.flowchart.config.ts`](../../../vite.flowchart.config.ts) L13 |

---

## Most dangerous architectural assumptions

1. **Single global `runtime` object** remains coherent under concurrency (pointer, pinch, connect, drag, marquee).  
2. **Supabase RLS + anon key** sufficiently constrain all tables reachable from editor — **RLS deep dive not done this phase.**  
3. **Compiler contract stability**: editor assumes `FlowchartCompiler` shape; only Vitest guards TS side.

---

## Immediate blockers

| Blocker | For whom | Evidence |
|---------|----------|----------|
| Strict repo-wide `tsc` in CI | Staff wanting type gate | TS2307 on `node:fs` / `__dirname` |
| Absence of CI | Org wanting safe releases | No `.github/workflows` |

**Not blocking:** local `npm ci`, `build:compilers`, `npm test` — all succeeded.

---

## Quick wins (low effort / high clarity)

| Win | Effort |
|-----|--------|
| Add `@types/node` + test tsconfig split → green `tsc` | Hours |
| Add GitHub Action: ci → `npm ci` + build + test + typecheck | Hours |
| Document `postMessage` target hardening plan for shell | Hours |
| Add `npm run typecheck` script | Minutes |

---

## Recommended next audit phase (Phase 2 charter)

1. **RLS & SQL review** for migrations + table access from each Edge function.  
2. **Auth/session** trace in `tool.html` (`bootstrapAuth`, token refresh).  
3. **XSS path trace** for all `innerHTML` sinks.  
4. **Playwright smoke**: load editor, create node, undo, AI mock (staging).  
5. **Performance profiling**: Chrome Performance panel on pan/zoom + connection render.

---

## Verification gaps (explicit)

| Gap | Reason |
|-----|--------|
| Production CSP / headers | Hosting config not in repo |
| Secrets in actual `supabase-config.js` | May be gitignored — not opened |
| Live latency / DB query timing | Needs staging + telemetry |

---

## Command outcomes (record)

```
npm ci          → PASS (0 npm vulnerabilities reported)
npm run build:compilers → PASS (Vite named/default export warning)
npm test        → PASS (38 tests)
npx tsc --noEmit       → FAIL (Node modules in tests)
```
