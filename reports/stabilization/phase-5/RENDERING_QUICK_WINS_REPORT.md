# Phase 5 — Rendering Quick Wins Report

## Rendering Optimizations Applied

### RW-1 — ResizeObserver → RAF + deferred persistence

- **Before:** `syncNodeSizes(); renderConnections(); markDirty();` synchronously on every observation.
- **After:** Single RAF slot runs sync + `scheduleRenderConnections`; **`markDirty` deferred 160 ms** after last coalesced tick.
- **Why safe:** Model still converges; autosave fires slightly later during continuous resize — acceptable trade-off.
- **Rollback:** Restore synchronous block in `ResizeObserver` constructor vicinity (~4276).

### RW-2 — Node DOM cache (`runtime.nodeElById`)

- **What:** `renderNodes` clears/fills `Map` from node id → root `.node` element.
- **`getNodeDomEl(id)`:** Returns cached connected element or falls back to `querySelector`.
- **Hot paths updated:** Flowchart drag, group drag, collision flash, layout animation tick, inspector-driven updates, theme refresh, pointer drag loop.
- **Why safe:** Cache invalidated entirely whenever `renderNodes` runs (`innerHTML` clears layer).
- **Rollback:** Remove `nodeElById`/`getNodeDomEl` and restore `nodesLayer.querySelector` literals.

### RW-3 — `renderAll` performance measurement

- Wraps full body in profiler marks when enabled — no behavioral change.

## Estimated FPS Improvements

**Not benchmarked** (no traces captured). Expected effects:

- Fewer redundant **forced layouts** during label resize bursts (defer `markDirty` reduces downstream churn).
- Lower **`querySelector` cost** during multi-node drag / theme toggles on medium graphs (**measurable on 50+ nodes**).

## Reduced Repaint Areas

- Resize churn: fewer immediate `saveDB` scheduling pulses while dimensions settle.

## Remaining Bottlenecks

- **`renderConnections` O(E×N)** obstacle preparation — untouched (Phase 6 architectural).
- Full **`innerHTML` clears** on nodes/edges — unchanged.
