# Cache hardening report

## Caches in scope

| Cache | Key | Invalidation |
|-------|-----|----------------|
| `runtime.nodeElById` | node id → `.node` element | `renderNodes` clears + rebuilds; `pruneNodeElCache`; `getNodeDomEl` drops disconnected |
| `runtime.groupBoxCache` | group id → bounds | `invalidateInteractionCaches()`; resize observer; duplicate/delete/undo |
| `runtime.connectionUi` | connection id → curve CPs | Pruned when connection removed (duplicate, delete, restore) |
| `runtime.graphCache` | layout key | Cleared on duplicate + undo restore |

## Helpers added

```js
invalidateInteractionCaches({ clearNodeEl, clearGraph })
pruneNodeElCache()
sanitizeSelectionState()
```

## Call sites

| Event | Actions |
|-------|---------|
| `renderAll` | `pruneNodeElCache()` |
| `restoreSnapshot` | full invalidate + sanitize + assert |
| `duplicateUserGroup` | full invalidate + sanitize + assert |
| `deleteUserGroupAndNodes` | invalidate + `renderAll` |
| ResizeObserver | `groupBoxCache = null` + overlay refresh |

## Fallback

`getNodeDomEl` always falls back to `nodesLayer.querySelector` if cache miss or stale.

## Debug

`localStorage.setItem("md_debug_groups", "1")` enables `assertProjectIntegrity(context)` warnings in console (non-fatal).

## Rollback

Remove helper block and call sites listed above.
