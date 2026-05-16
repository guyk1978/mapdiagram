# Phase 6 migration plan

## PR sequence

| # | Scope | Deliverable |
|---|--------|-------------|
| 0 | Docs | `docs/runtime/*` (this set) |
| 1 | Infra | `vite.tool-runtime.config.ts`, `app/runtime/mapdiagram-runtime.js`, tests harness |
| 2 | Overlay | Extract + adapters + `tests/runtime/overlay-runtime.test.ts` |
| 3 | Selection | Extract + emit + tests |
| 4 | Viewport | Extract + adapters |
| 5 | Render | Cache/RAF + tests |
| 6 | Group | `duplicateUserGroup` + box cache + tests |
| 7 | Command | Registry + pilot `duplicateGroup` |
| 8 | Reports | `reports/runtime-phase-6/PHASE_6_SUMMARY.md` |

## Adapter pattern

```html
<script src="/app/runtime/mapdiagram-runtime.js"></script>
<script>
  const mdCtx = MapDiagramRuntime.createRuntimeContext({ runtime, getProject, markDirty, emit, dom });
  const overlayRuntime = MapDiagramRuntime.createOverlayRuntime(mdCtx, overlayDeps);
  function openFocusModal(id) { return overlayRuntime.openFocusModal(id); }
</script>
```

## Rollback

```bash
git checkout -- app/tool.html app/runtime/ src/runtime/ vite.tool-runtime.config.ts package.json
```

## Success metrics

- No behavior change on smoke: modal, multi-select, group dup, undo
- `tool.html` script shrinks by ≥800 lines cumulative
- All new code covered by `npm run test:runtime`

## Non-goals

- `view.html` parity
- ESM-only `tool.html` without inline bootstrap
- Full command-pattern undo rewrite
