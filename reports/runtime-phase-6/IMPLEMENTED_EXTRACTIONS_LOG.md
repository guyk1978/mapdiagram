# Implemented Extractions Log

## PR sequence (logical)

### 1 — Docs gate
- Added `docs/runtime/` (10 markdown files).

### 2 — Infrastructure
- `src/runtime/runtime-context.js`
- `vite.tool-runtime.config.ts` → `app/runtime/mapdiagram-runtime.js`
- `package.json`: `build:tool-runtime`, `test:runtime`
- `vitest.config.ts`: happy-dom for overlay/render DOM tests

### 3 — Overlay
- **Files:** `src/runtime/overlay-runtime.js`
- **Adapters:** `mountIntoModalRoot`, `ensureFocusOverlayPortal`, `teardownFocusModalUi`, `openFocusModal`, `closeFocusModal`, `syncFocusModalOrphanGuard`
- **Tests:** `tests/runtime/overlay-runtime.test.ts`

### 4 — Selection
- **Files:** `src/runtime/selection-runtime.js`
- **Adapters:** `sanitizeSelectionState`, `isAdditiveSelection`, sticky UI fns, `clearAllForUndo` in `restoreSnapshot`
- **Tests:** `tests/runtime/selection-runtime.test.ts`

### 5 — Viewport
- **Files:** `src/runtime/viewport-runtime.js`
- **Adapters:** `world`, `updateViewport`, `zoomAt`, `fitToScreen`

### 6 — Render
- **Files:** `src/runtime/render-runtime.js`
- **Adapters:** `invalidateInteractionCaches`, `pruneNodeElCache`, `scheduleRenderConnections`
- **Tests:** `tests/runtime/render-runtime.test.ts`

### 7 — Group
- **Files:** `src/runtime/group-runtime.js`
- **Adapters:** `duplicateUserGroup`, `getUserGroupBox`
- **Tests:** `tests/runtime/group-runtime.test.ts`

### 8 — Command foundation
- **Files:** `src/runtime/command-runtime.js`
- **Pilot:** `duplicateGroup` command wrapping group duplicate
- **Tests:** `tests/runtime/command-runtime.test.ts`

### 9 — Boot wiring
- `initMapDiagramRuntimes()` in `tool.html` with ordered factory calls and `duplicateGroup` registration.

## Rollback (per step)

```bash
# Full Phase 6 runtime rollback
git checkout -- app/tool.html app/runtime/ src/runtime/ vite.tool-runtime.config.ts package.json package-lock.json vitest.config.ts tests/runtime reports/runtime-phase-6 docs/runtime
```

Rebuild compilers/runtime as needed after rollback:

```bash
npm run build:tool-runtime
```

## Verification

```bash
npm run build:tool-runtime
npm run test:runtime
```

Manual: extended editor, sticky multi-select, duplicate group, undo.
