# Group selection stabilization

## Root cause

Group hit targets (`.group-chrome-hit-edge`) are positioned from **`getUserGroupBox`**, which memoizes in **`runtime.groupBoxCache`**.

When nodes resize via **`ResizeObserver`** → **`syncNodeSizes()`**, node dimensions changed but:

- `groupBoxCache` was **not** invalidated
- `renderSemanticOverlays()` was **not** re-run

Hit edges stayed on **stale bounds** while nodes moved → clicks missed or hit wrong targets.

Secondary issue: **`selectedGroupIds` / `selectedNodeIds`** could retain ids after undo, delete, or import without pruning.

## Safe fix

### Geometry sync (`ResizeObserver` callback)

After `syncNodeSizes()`:

```js
runtime.groupBoxCache = null;
scheduleRenderConnections();
renderSemanticOverlays();
paintMinimap();
```

### Selection guards

- **`sanitizeSelectionState()`** — prunes node/group/connection/focus ids against live project; called from `renderSelection`, `applyUserGroupSelection`, `restoreSnapshot`, post-duplicate
- **`getNodeDomEl`** — drops disconnected cache entries; falls back to `querySelector`

### Debug assertions (`md_debug_groups=1`)

- Duplicate node/group ids
- Stale selection references
- Missing group frame (`getUserGroupBox` null)

## Regression risk

Extra overlay + minimap work on resize-heavy sessions (already RAF-coalesced).

## Rollback

Remove cache invalidation + `renderSemanticOverlays` from ResizeObserver; remove `sanitizeSelectionState` calls.

## Validation

- Select group edge/header repeatedly
- Resize nodes inside group; re-select
- After duplicate, undo/redo, save/load
