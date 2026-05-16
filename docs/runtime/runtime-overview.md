# Runtime overview

**Source:** `app/tool.html` inline `<script>` (~L3910–15570)  
**Branch:** `runtime-phase-6`

## Purpose

Single-page editor bootstrap: DOM refs, `runtime` state bag, project model (`getProject()`), render orchestration, pointer/keyboard handlers, persistence hooks.

## `runtime` object (state bag)

| Domain | Fields |
|--------|--------|
| **Project DB** | `db`, `autosaveTimer`, `cloudSyncTimer` |
| **Selection** | `selectedNodeId`, `selectedNodeIds`, `selectedGroupId`, `selectedGroupIds`, `selectedConnectionId`, `selectedConnectionIds`, `selectedGroupConnId`, `selectedGroupConnIds`, `selectedFlowGroupId`, `marquee`, `selectionMode`, `stickyMultiSelect` |
| **Interaction** | `dragging`, `panning`, `connecting`, `groupDragging`, `flowGroupDragging`, `pointers`, `pinch`, `cpDragging`, `groupConnecting`, `touchDragPending` |
| **Overlay / modal** | `focusNodeId`, `focusClosing`, `focusModalHistoryPrimed`, `focusModalWatchdog` |
| **Caches** | `nodeElById`, `groupBoxCache`, `groupBoxCacheProjectId`, `graphCache`, `graphCacheKey`, `connectionUi` |
| **Render scheduling** | `renderConnectionsRaf`, `semOverlayRaf`, `semanticOverlayScheduled`, `groupDragOverlayRaf` |
| **History** | `undo`, `redo` |
| **Auth / cloud** | `supabase`, `authUser`, `readOnly`, `publicViewSlug` |
| **Flowchart** | `fc*` fields, `flowGroups` via project |

Phase 6 **does not split** this object; modules receive `ctx.runtime` and mutate via contracts.

## Init order (approximate)

1. Constants (`DB_KEY`, `PUBLIC_VIEW_SLUG`)
2. DOM element refs (`workspace`, `viewport`, `modalRoot`, …)
3. `runtime = { … }`
4. Integrity helpers (`invalidateInteractionCaches`, `sanitizeSelectionState`)
5. Overlay portal (`ensureFocusOverlayPortal`)
6. `loadDB()` / `ensureBoot()` / `renderAll()`
7. Event listener registration (workspace, document keydown, …)
8. `initSupabase()` / `bootstrapAuth()`

## Gates

- `runtime.readOnly` — public view slug; blocks history, edits
- `isFlowchartMode()` — `body.flowchart-mode`
- `fcEditorCanSelect()` — flowchart + !readOnly

## Extraction target (Phase 6)

| Module | Owns logic |
|--------|------------|
| `overlay-runtime` | Focus modal + `#modal-root` |
| `selection-runtime` | Selection sets + sticky mode + sanitize |
| `viewport-runtime` | `p.view` transforms |
| `render-runtime` | Cache invalidation + connection RAF |
| `group-runtime` | Duplication + group box cache |
| `command-runtime` | Command registry (foundation) |

Persistence, full `renderNodes`/`renderConnections`, Supabase remain in monolith.
