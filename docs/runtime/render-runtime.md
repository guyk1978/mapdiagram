# Render runtime

## Central orchestrator (monolith)

`renderAll()` (~L12561):

1. `pruneNodeElCache`
2. `ensureProjectExtras`
3. `updateViewport`
4. `renderProjects`, `renderNodes`, `renderConnections`
5. `renderFlowGroupOverlays`, `renderSelection`
6. `renderNodeSemanticClasses`, `renderSemanticOverlays`
7. `renderSuggestions`, minimap, flowchart empty state

Phase 6 extracts **scheduling + caches only**, not DOM builders.

## Cache layers

| Cache | Invalidation |
|-------|----------------|
| `runtime.nodeElById` | `pruneNodeElCache`, `invalidateInteractionCaches({ clearNodeEl })` |
| `runtime.groupBoxCache` | `invalidateInteractionCaches`, resize observer |
| `runtime.graphCache` | `invalidateInteractionCaches({ clearGraph })` |

## Scheduling

- `scheduleRenderConnections()` — RAF → `renderConnections` + `renderSelection`
- `scheduleSemanticOverlaysThrottled()` — separate RAF
- `markDirty()` — autosave debounce

## Module API

`createRenderRuntime(ctx, deps)` →

- `invalidateInteractionCaches(opts)`
- `pruneNodeElCache()`
- `scheduleRenderConnections()`
- `requestRender(flags)` — optional dirty bitmask for future

`deps.renderConnections`, `deps.renderSelection` stay in monolith.

## Rules

- Modules must not call `renderAll()` directly unless via `deps.scheduleFullRender`
- Selection changes emit event; render runtime does not own selection
