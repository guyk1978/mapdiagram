# Selection runtime

## State (on `runtime`)

| Field | Type | Meaning |
|-------|------|---------|
| `selectedNodeId` | string \| null | Primary node (inspector) |
| `selectedNodeIds` | Set | Multi node |
| `selectedGroupId` | string \| null | Primary group |
| `selectedGroupIds` | Set | Multi group |
| `selectedConnectionId(s)` | conn multi-select |
| `selectedGroupConnId(s)` | system link multi-select |
| `selectedFlowGroupId` | flowchart flow group |
| `stickyMultiSelect` | boolean | Virtual Shift |
| `marquee` | object \| null | Box select in progress |

## Mutation entry points (pre-extraction)

- Node `.body` `pointerdown` (~L10354)
- `applyUserGroupSelection` (~L8752)
- `selectOrDeleteConnectionEdge` / `selectOrDeleteGroupConnEdge`
- Connection list click (~L11289)
- Workspace empty `pointerdown` + marquee end (~L14340, ~L14690)
- `restoreSnapshot`, `clearFcInteractionState`, template apply

## Core logic

```js
isAdditiveSelection(ev) => ev.shiftKey || runtime.stickyMultiSelect
```

`sanitizeSelectionState()` — prune stale IDs against project; calls overlay orphan guard.

## Module API

`createSelectionRuntime(ctx, deps)` →

- `isAdditive(ev)`
- `sanitizeSelection()`
- `toggleNode(id)`, `selectNode(id, opts)`
- `applyGroupSelection(g, ev, opts)` — UI side effects via deps
- `clearSelection(kind?)`
- `getSelection()`
- `setStickyMultiSelect(on)`, `toggleStickyMultiSelect()`, `syncStickyMultiSelectUi()`

## Emit contract

`ctx.emit('selectionChanged')` → monolith runs `renderSelection`, `syncTopbarGroupActions`, `syncGroupInspectorMeta`.
