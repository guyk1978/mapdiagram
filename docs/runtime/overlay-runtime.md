# Overlay runtime

## DOM surfaces

| ID / class | Role |
|------------|------|
| `#modal-root` | Portal host (`.md-modal-root`), `aria-hidden` toggled |
| `#focusOverlay` | Extended node editor (`.focus-modal-overlay`) |
| `#focusModal` | Dialog panel (`.focus-modal`) |
| `#authOverlay`, `#aiModalOverlay` | Not extracted in 6.2 (future `registerOverlay`) |
| `#commandPaletteOverlay`, `#keyboardHelpOverlay`, `#importDiffOverlay` | Same |

## Ownership

- **Owns:** open/close lifecycle, portal mount, rescue classes, watchdog, `runtime.focusNodeId` during modal
- **Must not:** mutate `selectedNodeIds` / `selectedGroupIds`

## Key functions (pre-extraction lines)

| Function | Responsibility |
|----------|----------------|
| `mountIntoModalRoot` | Append overlay to `#modal-root` |
| `ensureFocusOverlayPortal` | Mount `#focusOverlay` at init |
| `openFocusModal` | Atomic open (measure → layout check → `.open`) |
| `closeFocusModal` | Sync model, teardown |
| `teardownFocusModalUi` | Always clears backdrop (orphan-safe) |
| `syncFocusModalOrphanGuard` | Close if `focusNodeId` invalid |
| `populateFocusModalFields` | Inspector field sync (stays as dep callback) |

## ESC priority (document order)

1. Focus modal open → `closeFocusModal`
2. Sticky multi-select off
3. Editing node / group drag / palettes / import diff / fc delete confirm / assistant
4. Flowchart connecting / flow group drag / clear selection

## Fragile paths

- Opacity transition at t=0 (use layout validation, `.md-focus-modal-instant`)
- `sanitizeSelectionState` → `syncFocusModalOrphanGuard`
- `restoreSnapshot` → `teardownFocusModalUi`

## Module API

`MapDiagramRuntime.createOverlayRuntime(ctx, deps)` → `{ openFocusModal, closeFocusModal, teardownFocusModalUi, syncFocusModalOrphanGuard, ensureFocusOverlayPortal, isFocusOpen, registerOverlay, closeAllOverlays, handleEscape }`
