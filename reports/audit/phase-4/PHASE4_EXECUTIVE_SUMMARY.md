# Phase 4 — Executive Summary

Operational-performance audit of **`app/tool.html`** (primary), **`app/view.html`**, and publish bootstrap (**`assets/flowchart-product.js`**). Full detail: sibling files in **`reports/audit/phase-4/`**.

---

## Top operational risks

| # | Finding | Severity | Where |
|---|---------|----------|-------|
| 1 | **`renderConnections` builds per-edge obstacle lists by scanning almost all nodes** — asymptotic **O(E × N)** plus SVG rebuild | **Critical** at scale | `tool.html` ~10303–10309 (+ parallel bridge blocks) |
| 2 | **`ResizeObserver` fires full edge rerender + `markDirty`** without RAF batching — compounds layout reads (`syncNodeSizes` uses `offsetWidth/Height`) | **High** | ~4276–4279, ~12036–12042 |
| 3 | **Undo retains up to 120 full JSON snapshots** via `deepCopy` — memory scales with diagram × edits | **Critical** long-session | ~5496–5508, ~3991 |
| 4 | **`updateViewport` invokes `paintMinimap`** each time — when minimap **is visible**, wheel zoom floods canvas repaints | **Medium–High** | ~9589–9597; early-out ~12067 when hidden |
| 5 | **Document-level `pointermove`** drives drag/update paths with per-node **`querySelector`** — multi-select lag | **Medium–High** | ~13925–14018 |

---

## Scalability verdict

The editor is **well-suited to small/medium diagrams** (aligned with AI FlowchartSpec caps in **`src/flowchart`**). **No hard ceiling** prevents importing massive graphs — worst-case paths hit **quadratic routing prep + full DOM/SVG teardown** → freezes and tab instability.

**Conservative thresholds (Not benchmarked):** fluid UX roughly **< ~80–120 nodes** with moderate edges; pain escalates rapidly beyond that especially with **orthogonal** routing.

---

## UX reliability headline

Interaction logic is broad but **main-thread coupled**: connecting, dragging, and zooming all compete with **full rerenders**. Largest perceptual wins likely come from **coalescing ResizeObserver**, **throttling minimap**, and **indexing obstacles** — before any virtualization rewrite.

Cross-input inconsistency: **max zoom differs** for wheel (**2.2**) vs pinch (**2.8**) (`zoomAt` vs pinch handler).

---

## Browser / platform

Aggressive **`preventDefault`** on workspace wheel/touch trades native scrolling for editor control — correct product choice but **mobile fragility** remains (**Not verified** on Safari).

---

## Production readiness coupling

Performance risks **amplify support burden**: users blame “bugs” for synchronous stalls caused by **`JSON.stringify`** autosave + heavy rerenders. Combine with Phase 3 gaps (Stripe webhook, observability) for overall **conditional production posture**.

---

## Recommended next actions

1. **Instrument** `renderConnections` / `renderNodes` duration in staging (histogram).  
2. Ship **P1+P2** from **`PERFORMANCE_OPTIMIZATION_STRATEGY.md`** (observer debounce + minimap throttle).  
3. Prototype **spatial obstacle index** (single pass per frame).  
4. Run scripted **large-json imports** to validate thresholds empirically.

---

## Deliverables index

| Report |
|--------|
| [`RENDERING_PERFORMANCE_REPORT.md`](RENDERING_PERFORMANCE_REPORT.md) |
| [`MEMORY_SESSION_STABILITY_REPORT.md`](MEMORY_SESSION_STABILITY_REPORT.md) |
| [`LARGE_GRAPH_SCALABILITY_REPORT.md`](LARGE_GRAPH_SCALABILITY_REPORT.md) |
| [`UX_RELIABILITY_REPORT.md`](UX_RELIABILITY_REPORT.md) |
| [`BROWSER_COMPATIBILITY_REPORT.md`](BROWSER_COMPATIBILITY_REPORT.md) |
| [`PRODUCTION_READINESS_REPORT.md`](PRODUCTION_READINESS_REPORT.md) |
| [`PERFORMANCE_OPTIMIZATION_STRATEGY.md`](PERFORMANCE_OPTIMIZATION_STRATEGY.md) |
