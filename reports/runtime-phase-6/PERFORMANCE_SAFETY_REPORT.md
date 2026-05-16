# Performance Safety Report

## Preserved behaviors

- **Connection RAF coalescing** — `scheduleRenderConnections` cancels prior frame id before scheduling; tests verify single flush per batch.
- **Cache invalidation single path** — `invalidateInteractionCaches` lives in `render-runtime.js`; adapters delegate from `tool.html`.
- **No duplicate portal observers** — overlay portal mount is idempotent (`mountIntoModalRoot`).
- **Modal open** — layout-first validation; instant class removed after rAF; watchdog timeout unchanged.

## Checklist (Phase 6 PR)

- [x] `invalidateInteractionCaches` routed through render runtime
- [x] `pruneNodeElCache` at render pipeline entry (via adapter)
- [x] Group duplicate invalidates caches + `clearNodeEl` / `clearGraph`
- [x] No second `pushHistory` on duplicate command path
- [ ] `MDRuntimeProfiler` marks — remain on monolith `renderAll` (unchanged)

## Non-goals

- Moving `renderNodes` / `renderConnections` (DOM-heavy) out of monolith.
- Canvas/React rewrite.
