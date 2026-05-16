# Phase 6 Summary — Controlled Runtime Extraction

## Delivered

| Area | Artifact |
|------|----------|
| System map | `docs/runtime/*.md` (10 files) |
| Runtime modules | `src/runtime/*.js` → `app/runtime/mapdiagram-runtime.js` |
| Editor wiring | `app/tool.html` adapters + `initMapDiagramRuntimes()` |
| Tests | `tests/runtime/*.test.ts` (14 tests) |
| Reports | `reports/runtime-phase-6/*.md` |

## Extracted capabilities

- **Overlay:** portal, focus modal lifecycle, orphan guard, `handleEscape` API.
- **Selection:** sanitize, sticky multi-select, additive helper, group selection helper, `clearAllForUndo`.
- **Viewport:** world coords, viewport transform, zoom-at-pointer, fit-to-screen.
- **Render:** cache invalidation, node el prune, connection RAF scheduler, dirty flags.
- **Group:** duplicate subtree, group box cache.
- **Command:** registry + `duplicateGroup` pilot.

## Remaining in monolith

- Event listeners (pointer, keyboard, marquee handlers).
- `renderAll`, `renderNodes`, `renderConnections`, semantic overlays.
- Persistence, auth, AI, import diff overlays.
- Majority of direct `runtime.selected*` mutations in handlers (migrate incrementally).

## Commands

```bash
npm run build:tool-runtime
npm run test:runtime
```

## Success criteria (Phase 6)

- [x] Docs gate before extraction
- [x] Runtime bundle + adapters load path
- [x] Focus modal lifecycle traceable to overlay module
- [x] Selection sanitize/sticky/undo-clear in selection module
- [x] Duplicate group via command + group modules
- [x] Unit tests without loading `tool.html`
- [ ] Line-count reduction target (−800–1500) — partial; large DOM/render blocks intentionally retained
