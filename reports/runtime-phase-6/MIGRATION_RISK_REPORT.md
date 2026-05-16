# Migration Risk Report

## Risks

| Risk | Severity | Status |
|------|----------|--------|
| Bundle not built / missing script | High | Mitigated: `build:tool-runtime` in CI/npm test chain |
| `initMapDiagramRuntimes` not called before early adapter | High | Mitigated: lazy `initMapDiagramRuntimes()` in each adapter + boot call |
| Double `pushHistory` on duplicate | Medium | Mitigated: `pushHistoryOnDuplicate: false` on group runtime; command pushes once |
| Orphan focus backdrop | Medium | Mitigated: `syncFocusModalOrphanGuard` in selection sanitize |
| Layout-based modal open failure | Medium | Preserved layout checks; no opacity trap |
| Selection/render drift | Medium | `emit` + `onSelectionChanged` → `renderSelection` |
| Stale grep direct `runtime.selected*` writes | Low–Med | Incremental enforcement; many paths still in monolith handlers |

## Regression targets (manual smoke)

- Open/close extended editor ×5
- Sticky multi-select + marquee additive
- Duplicate user group + undo once
- Pan/zoom + fit to screen

## Test coverage

`tests/runtime/*.test.ts` — 14 unit tests (overlay, selection, render, group, command). No `tool.html` load required.
