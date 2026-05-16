# Command System Foundation

## Scope (Phase 6)

`command-runtime.js` provides a **registry** only. Existing `pushHistory` / `restoreSnapshot` undo stacks in `tool.html` are unchanged.

## API

```js
registerCommand(name, { describe, execute })
executeCommand(name, payload, { pushHistory?: boolean })
hasCommand(name) / listCommands()
```

- Default: `executeCommand` calls `deps.pushHistory()` once before `execute`.
- Opt out: `{ pushHistory: false }` for callers that already pushed.

## Pilot command

| Name | Payload | Execute |
|------|---------|---------|
| `duplicateGroup` | `{ rootId }` | `groupRuntime.duplicateUserGroup(rootId)` |

`tool.html`:

```js
function duplicateUserGroup(rootId) {
  initMapDiagramRuntimes();
  if (commandRuntime) return commandRuntime.executeCommand("duplicateGroup", { rootId });
  …
}
```

Group runtime uses `pushHistoryOnDuplicate: false` when wired from command to avoid double history entries.

## Future migration

1. Register high-churn mutations (`deleteNodes`, `mergeGroups`, …) with paired undo metadata.
2. Optionally wrap `restoreSnapshot` to replay command inverse descriptors (Phase 7+).
3. Keep DOM writes out of command `execute`; use runtime modules + `scheduleFullRender`.
