# Group runtime

## Project model

- `p.userGroups[]` — hierarchy via `parentGroupId`, `childGroupIds`, `nodeIds`
- `p.groupConnections[]` — system–system edges
- `p._groupLocalSpace === 2` — local node coords inside groups

## Caches

- `runtime.groupBoxCache` — `Map<groupId, box>`
- Invalidated via `invalidateInteractionCaches()` / `groupBoxCache = null`

## Key functions

| Function | Role |
|----------|------|
| `computeUserGroupBox` | Bounds from nodes + children |
| `getUserGroupBox` | Cached wrapper |
| `duplicateUserGroup` | Subtree clone + `connIdMap` + branch-from remap |
| `renderSemanticOverlays` | DOM chrome (stays in monolith) |
| `syncStoredGroupBoundsForGroupIds` | Post-dup bounds sync |

## Duplication contract

- Offset: `MD_GROUP_DUP_OFFSET` (40px)
- Maps: `gidMap`, `nodeMap`, `connIdMap`
- Clears node/conn selection; selects new root only
- Calls: `pushHistory`, `invalidateInteractionCaches({ clearNodeEl, clearGraph })`, `renderAll`, `sanitizeSelectionState`, `assertProjectIntegrity`

## Module boundary

**In module:** `duplicateUserGroup`, `getUserGroupBox`, `invalidateGroupBoxCache`  
**In monolith:** `renderSemanticOverlays`, drag handlers, `createUserGroupFromSelection`

## Dependencies (injected)

`uid`, `deepCopy`, `normalizeGroup`, `getDescendantGroupIds`, `getAllNodeIdsInGroupSubtree`, `reindexUserGroupHierarchy`, `dedupeUserGroupMembership`, connection normalizers, `pushHistory`, `renderAll`, `sanitizeSelectionState`, etc.
