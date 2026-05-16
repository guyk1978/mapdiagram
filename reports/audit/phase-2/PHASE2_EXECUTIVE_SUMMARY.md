# Phase 2 — Executive Summary

**Audit scope:** Deep runtime architecture of [`app/tool.html`](../../../app/tool.html) (editor monolith), cross-cutting persistence/auth/network/render/event paths.  
**Prior phases:** [`reports/audit/phase-1/PHASE1_EXECUTIVE_SUMMARY.md`](../phase-1/PHASE1_EXECUTIVE_SUMMARY.md)

---

## Deliverables index

| Report | Highlights |
|--------|------------|
| [STATE_ARCHITECTURE_REPORT.md](./STATE_ARCHITECTURE_REPORT.md) | `runtime` ownership, undo gaps, ResizeObserver coupling |
| [EVENT_SYSTEM_REPORT.md](./EVENT_SYSTEM_REPORT.md) | Document mega-handlers, listener lifecycle |
| [RENDERING_PIPELINE_REPORT.md](./RENDERING_PIPELINE_REPORT.md) | Full DOM/SVG teardown patterns |
| [SAVE_LOAD_CONSISTENCY_REPORT.md](./SAVE_LOAD_CONSISTENCY_REPORT.md) | History vs `connectionUi`, cloud replace |
| [NETWORK_RUNTIME_REPORT.md](./NETWORK_RUNTIME_REPORT.md) | Supabase flows, collision gaps |
| [RUNTIME_SECURITY_REPORT.md](./RUNTIME_SECURITY_REPORT.md) | **`innerHTML` XSS on project names** |
| [MONOLITH_EXTRACTION_PLAN.md](./MONOLITH_EXTRACTION_PLAN.md) | Staged extraction ordering |

---

## Top 10 operational risks

| # | Risk | Severity | Confidence | Primary evidence |
|---|------|----------|------------|------------------|
| 1 | Full **`renderNodes` + `renderConnections`** rebuild on many paths (`innerHTML=""`) | **Critical** | High | ~9994–9995, ~10017–10018 |
| 2 | **`ResizeObserver` → `renderConnections` + `markDirty`** feedback loop | **High** | High | ~4276–4280 |
| 3 | **Undo omits `connectionUi` + stale `selectedFlowGroupId`** after restore | **High** | High | ~5499 vs ~5517–5554 |
| 4 | **`loadCloudProjects` replaces entire project array** — race with local edits | **High** | Medium | ~5390–5414 |
| 5 | **Project list XSS** via `${p.name}` in `innerHTML` | **Critical** | High | ~9628 |
| 6 | Single **`document`-level `pointermove`** multiplex | **High** | High | ~13925 |
| 7 | **`zoomAt` calls `markDirty`** → autosave churn on zoom | Medium | High | ~12146–12158 |
| 8 | Duplicate **`window.resize`** listeners | Medium | High | ~13655 & ~14652 |
| 9 | Auth **`console.log`** of session fragments | Medium | High | ~5461–5466 |
| 10 | History capped **120** deep copies — memory latency spikes | Medium | High | ~5507 |

---

## Most dangerous architectural assumptions

1. **`renderAll()` is cheap enough** to invoke broadly — invalidated by full SVG/DOM churn.  
2. **Undo snapshots are sufficient** if graph fields alone restored — invalidated by omitted overlay/UI state.  
3. **Cloud merge is last-write-wins safe** — replacement fetch challenges offline-first intuitions.

---

## Immediate blockers (engineering)

| Blocker | Owner recommendation |
|---------|---------------------|
| XSS in project list | Ship escaped rendering **before** broader refactor |
| Undo integrity broken for flow groups | Patch `restoreSnapshot` selection hygiene |

---

## Quick wins

| Win | Effort | Impact |
|-----|--------|--------|
| Escape project names / use DOM APIs | Hours | Closes Critical XSS |
| Clear flow selection + `connectionUi` on undo | Hours | Stability |
| Debounce ResizeObserver render path | Hours | FPS |
| Merge duplicate resize handlers | Minutes–hours | CPU |

---

## Recommended Phase 3 charter

1. **Profiler-guided**: Chrome Performance traces — drag vs resize vs zoom.  
2. **Security sweep**: exhaustive `innerHTML` audit with user taint classification.  
3. **Concurrency harness**: simulate login/logout during dirty autosave timer.  
4. **Import pipeline audit**: JSON attack surfaces.  
5. **Playwright smoke suite** wired into CI (blocked until Phase 1 typecheck fixed optionally).

---

## Explicit unknowns ("Not verified")

| Topic | Instrumentation needed |
|-------|------------------------|
| Auth subscription teardown leaks | Heap timeline / Supabase docs hook |
| Exact race window cloud vs autosave | Scripted concurrent delays |
| FlowchartProduct snapshot fields | Read [`assets/flowchart-product.js`](../../../assets/flowchart-product.js) Phase 3 |

---

## Document corrections vs Phase 2 draft assumptions

- Duplicate global `keydown` at ~13361 is **topbar Escape-only**; heavy shortcuts remain ~14473 — conflict risk lowered but still merits consolidation review.
