# Phase 6 — Extraction Strategy

## Goal

Shrink the monolithic inline script in `app/tool.html` by moving **lifecycle and state-mutation logic** into `src/runtime/*.js`, built as a single IIFE (`app/runtime/mapdiagram-runtime.js`) and wired through thin adapters.

## Adapter-first rule

- `tool.html` keeps DOM refs, event listeners, and `renderAll` / `renderNodes` DOM builders.
- Modules receive `createRuntimeContext({ runtime, getProject, markDirty, dom, emit })` plus feature-specific `deps`.
- Adapters call `initMapDiagramRuntimes()` once, then delegate (e.g. `openFocusModal` → `overlayRuntime.openFocusModal`).

## Build & load

- Source: `src/runtime/index.js` (barrel).
- Build: `npm run build:tool-runtime` (`vite.tool-runtime.config.ts`).
- Load: `<script src="/app/runtime/mapdiagram-runtime.js"></script>` before inline boot script.

## Extraction order (completed in Phase 6)

1. Infrastructure — context, Vite IIFE, test harness.
2. Overlay — focus modal + portal + ESC helper API.
3. Selection — sanitize, sticky, additive, undo clear.
4. Viewport — `world`, `updateViewport`, `zoomAt`, `fitToScreen`.
5. Render — cache invalidation, connection RAF, dirty `requestRender`/`flush`.
6. Group — `duplicateUserGroup`, `groupBoxCache`.
7. Command — registry + pilot `duplicateGroup`.

## Deferred (Phase 6.2+)

- Auth, AI, command palette, kbd help overlays → `registerOverlay`.
- `renderNodes` / `renderConnections` DOM implementation.
- Persistence / Supabase modules.
- Direct selection writes outside `selection-runtime` (grep enforcement per PR).

## Rollback

```bash
git checkout -- app/tool.html app/runtime/ src/runtime/ vite.tool-runtime.config.ts package.json vitest.config.ts tests/runtime
```
