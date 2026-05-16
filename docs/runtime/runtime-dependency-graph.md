# Runtime dependency graph

## Layer diagram

```mermaid
flowchart BT
  persistence[Persistence loadDB/saveDB]
  project[getProject / ensureProjectExtras]
  runtimeState[runtime state bag]
  viewport[Viewport p.view]
  selection[Selection sets]
  overlay[Overlay focusNodeId]
  renderCache[Render caches]
  renderDOM[renderAll DOM builders]
  handlers[Pointer/keyboard handlers]
  persistence --> project
  project --> runtimeState
  handlers --> selection
  handlers --> overlay
  handlers --> viewport
  selection --> renderDOM
  overlay --> renderDOM
  viewport --> renderDOM
  renderCache --> renderDOM
  groupOps[Group duplicate/bounds] --> renderCache
  groupOps --> selection
  undo[pushHistory/restoreSnapshot] --> overlay
  undo --> selection
  undo --> renderCache
  undo --> renderDOM
```

## Dangerous mutation zones

| Zone | Functions | Touches |
|------|-----------|---------|
| **H1** | `restoreSnapshot` | overlay, all selection, caches, full render |
| **H2** | `renderAll` | entire canvas + inspector sync |
| **H3** | `duplicateUserGroup` | project, selection, caches, render |
| **H4** | `sanitizeSelectionState` | selection + overlay guard |
| **H5** | `openFocusModal` / `closeFocusModal` | overlay + inspector fields |

## Coupling edges (must use adapters)

- `sanitizeSelectionState` → `overlayRuntime.syncFocusModalOrphanGuard`
- `restoreSnapshot` → `overlayRuntime.teardownFocusModalUi` + `selectionRuntime.clearAll`
- `duplicateUserGroup` → `renderRuntime.invalidate` + `selectionRuntime` set group

## Cycles to avoid

- overlay → renderAll → sanitize → overlay (guard prevents orphan only)
- selection module must not import render module; use `emit('selectionChanged')`

## Extraction order (dependency-safe)

1. Overlay (fewest upstream deps if deps injected)
2. Selection (emit to render)
3. Viewport (mostly `p.view`)
4. Render caches (used by group/selection)
5. Group (depends on render invalidate + selection)
6. Command (wraps group + pushHistory)
