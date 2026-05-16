# Group duplication hardening

## Root cause

`duplicateUserGroup` cloned groups/nodes/edges but left several integrity gaps:

1. **Offset too large (80px)** — copies visually stacked on originals; user perceived “overlap corruption”
2. **Missing `branch-from` remapping** — branch edges referenced old parent connection IDs → broken or missing render
3. **Stale `runtime.connectionUi`** — orphaned curve handles keyed by deleted connection ids
4. **Incomplete selection reset** — node/edge selection could reference pre-duplicate ids
5. **No bounds sync** — `g.width` / `g.height` not refreshed for new groups before paint
6. **Cache not fully cleared** — `groupBoxCache` and `nodeElById` could serve stale geometry

## Safe fix (`duplicateUserGroup` in `app/tool.html`)

| Guarantee | Implementation |
|-----------|----------------|
| New group IDs | `gidMap` + `uid()` per group in subtree |
| New node IDs | `nodeMap` + `deepCopy` + `normalizeNode` |
| New edge IDs | `connIdMap` for node–node; second pass for `branch-from` |
| Offset +40 | `MD_GROUP_DUP_OFFSET = 40` — world groups: `g.x/y += 40`; legacy nodes: `n.x/y += 40` |
| Selection | Clear nodes/edges; select new root only |
| Frames | `syncStoredGroupBoundsForGroupIds(p, newGroupIds)` |
| Caches | `invalidateInteractionCaches({ clearNodeEl: true, clearGraph: true })` |
| Render | `renderAll()` + `sanitizeSelectionState()` |
| Debug | `assertProjectIntegrity("duplicateUserGroup")` when `md_debug_groups=1` |

## Regression risk

| Risk | Notes |
|------|-------|
| Cross-subtree edges | Edges spanning duplicate boundary are still intentionally not copied (same as before) |
| Nested groups all shift +40 | Preserves relative world spacing; required for local-space model |

## Rollback

Revert `duplicateUserGroup` body to pre-sprint version (OFF=80, no branch pass, no `syncStoredGroupBounds`, no `invalidateInteractionCaches`).

## Validation

- Repeated / rapid duplicate
- Duplicate after undo/redo, zoom, load
- Large / nested groups: frames visible, draggable, original untouched
