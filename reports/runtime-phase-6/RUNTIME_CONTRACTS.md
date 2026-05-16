# Runtime Contracts (Phase 6)

| System | Owns | May read | Must not |
|--------|------|----------|----------|
| **Overlay** | Focus modal open/close, portal mount, ESC for focus | `focusNodeId`, DOM refs | Mutate `selected*` sets |
| **Selection** | All `selected*` sets, sticky mode, sanitize | `getProject()` ids | Call `renderAll` directly |
| **Viewport** | `p.view` transform, grid toggle UI | workspace rect | Mutate project nodes/groups |
| **Render** | `groupBoxCache` nulling, `nodeElById`, graph cache, connection RAF | project snapshot via ctx | Change selection |
| **Group** | Duplicate subtree, bounds cache | selection (post-dup target) | Open overlays |
| **Command** | Registry, execute wrapper | all via ctx/deps callbacks | Silent DOM writes |

## Events

- `ctx.emit('selectionChanged')` — adapter renders selection + topbar.
- `ctx.emit('overlayOpened' | 'overlayClosed')` — optional telemetry hooks.

## State bag

The `runtime` object remains the single in-memory state bag for Phase 6. Modules read/write fields on `ctx.runtime` per contracts above.
