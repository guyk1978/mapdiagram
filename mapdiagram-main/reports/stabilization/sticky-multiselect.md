# Sticky multi-select mode

**Date:** 2026-05-16  
**Target:** `app/tool.html`

## Summary

Toolbar control toggles `runtime.stickyMultiSelect`, a persistent “virtual SHIFT” mode for additive selection on canvas nodes, user groups, connections, and marquee—without dispatching keyboard events.

---

## Runtime state

```js
runtime.stickyMultiSelect = false; // default
```

Helper:

```js
function isAdditiveSelection(ev) {
  return !!(ev && (ev.shiftKey || runtime.stickyMultiSelect));
}
```

Physical **Shift** still works; sticky mode OR Shift enables the same code paths.

---

## UI

| Element | Location |
|---------|----------|
| `#stickyMultiSelectBtn` | Top toolbar `.topbar-desktop-quick` (icon, layered boxes + plus) |
| `#mobileStickyMultiSelectBtn` | Mobile quick actions row |
| Overflow menu | `data-mirror-click="stickyMultiSelectBtn"` |

**Active state:** `.is-active`, `aria-pressed="true"`, `body.md-sticky-multiselect` (workspace `cursor: cell`).

**Feedback:** `savedIndicator` shows “Multi-select ON” briefly when enabled.

**Shortcuts:**

- `M` — toggle (when not typing, no modifiers, modal closed)
- `Escape` — turn off sticky mode (does not clear selection)

---

## Integration points

| Handler | Change |
|---------|--------|
| Node `pointerdown` (`.body`) | `isAdditiveSelection(e)` → toggle `selectedNodeIds`, no replace |
| `applyUserGroupSelection` | additive group toggle when sticky/Shift |
| `selectOrDeleteConnectionEdge` | sticky treated like Shift for edge multi-select |
| `selectOrDeleteGroupConnEdge` | same |
| Connection list panel clicks | additive when sticky/Shift |
| Workspace empty `pointerdown` | marquee when sticky/Shift; `additive: isAdditiveSelection(e)` |
| Marquee end | preserves existing selection when `m.additive` |

**Not changed:** Ctrl/Cmd+click node toggle, flow-group selection, CP drag snap (`e.shiftKey` only), arrow nudge step size.

---

## Behavior

### OFF (default)

- Click node/group → single selection (existing logic).
- Empty canvas click → clears selection, then pan or marquee per mode.

### ON

- Click node → add/remove from `selectedNodeIds` (like Shift).
- Click group frame → add/remove from `selectedGroupIds`.
- Click connection in list or on canvas → additive edge selection.
- Drag marquee on empty canvas → additive box select (like Shift+marquee).
- Mode stays on until toolbar toggle, `M`, or `Escape`.

---

## Edge cases

| Case | Handling |
|------|----------|
| `readOnly` / public view | `setStickyMultiSelect` forces off |
| Sticky + Ctrl+click node | Ctrl path still runs (separate branch) |
| Flowchart without `fcEditorCanSelect` | Sticky uses same guard as Shift: `!isFlowchartMode() \|\| fcEditorCanSelect()` |
| `sanitizeSelectionState` | Unchanged; prunes stale IDs only |
| Undo/redo | No sticky flag in history; mode persists across undo |
| Zoom/pan | Unaffected; space/middle-drag unchanged |

---

## Rollback

```bash
git checkout -- app/tool.html
```

Remove:

- `runtime.stickyMultiSelect`, `isAdditiveSelection`, `syncStickyMultiSelectUi`, `setStickyMultiSelect`, `toggleStickyMultiSelect`
- Toolbar/mobile/menu button markup and CSS (`#stickyMultiSelectBtn`, `body.md-sticky-multiselect`)
- Replacements of `e.shiftKey` with `isAdditiveSelection(e)` at integration sites
- `M` / `Escape` handlers in `keydown`

---

## Manual test checklist

- [ ] Toggle toolbar button → highlighted, cursor changes
- [ ] Select multiple nodes without Shift
- [ ] Click selected node again → deselects
- [ ] Select multiple groups
- [ ] Duplicate / delete multi-selection
- [ ] Undo/redo with mode on
- [ ] Pan/zoom with mode on
- [ ] `Escape` turns mode off
- [ ] `M` toggles mode
- [ ] Mobile “Multi-select” button mirrors desktop
