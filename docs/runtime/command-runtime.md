# Command runtime

## Current undo model (monolith)

- `pushHistory()` — deepCopy project slice onto `runtime.undo`
- `restoreSnapshot(stackFrom, stackTo)` — pop/push stacks, **full side-effect chain**:
  - `teardownFocusModalUi`
  - Clear all selection fields
  - `clearFcInteractionState`
  - `invalidateInteractionCaches({ clearNodeEl, clearGraph })`
  - `renderAll()`
  - `sanitizeSelectionState()`

## Phase 6 scope

**Foundation only** — no replacement of undo stacks.

```js
registerCommand(name, { execute, describe })
executeCommand(name, payload) // calls deps.pushHistory() once, then execute
```

## Pilot command

`duplicateGroup` → `executeCommand('duplicateGroup', { rootId })` wrapping `groupRuntime.duplicateUserGroup`.

## Future migration

1. Register commands for delete node, move, connect
2. Pair execute/undo snapshots per command
3. Narrow `restoreSnapshot` to command undo stack

## Coupling warning

`primeFocusModalHistoryOnce` calls `pushHistory` from overlay path — command runtime must not double-push when pilot wraps dup only.
