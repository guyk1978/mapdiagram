# Modal runtime recovery — extended editor

**Date:** 2026-05-16  
**Target:** `app/tool.html`  
**Symptom:** “Open extended editor” showed a blocking backdrop with no dialog; UI sometimes stayed blocked until refresh.

---

## Root cause (two failures)

### 1. False-negative visibility check rolled back a successful open

`openFocusModal` added `.open` to the backdrop, then immediately validated with `getComputedStyle(modal).opacity > 0.05`.

The overlay and dialog use **220ms opacity transitions**. At `t=0`, computed opacity is **0** even when CSS is correct. The new “atomic” guard treated that as failure, called `teardownFocusModalUi()`, and left users with a **flashing or stuck scrim** depending on timing.

**Failing step:** post-open validation (rAF / pre-open opacity check).  
**Why overlay survived:** partial class toggling before rollback, or orphan path below.

### 2. Orphan backdrop — `focusNodeId` cleared without closing UI

`sanitizeSelectionState()` cleared `runtime.focusNodeId` when the focused node was deleted or deselected, but **did not remove** `.open` from `#focusOverlay`.

`closeFocusModal()` began with:

```js
if (!runtime.focusNodeId || runtime.focusClosing) return;
```

So with an open overlay and `focusNodeId === null`:

- ESC did nothing (`Escape` handler required `focusNodeId`)
- Backdrop click called `closeFocusModal()` → no-op
- Invisible `#focusModal` still had `pointer-events: auto` in some states, intercepting clicks in the center

**Failing step:** selection sanitization vs. modal teardown.  
**Why overlay survived:** backdrop lifecycle tied to `focusNodeId`, not overlay DOM state.

---

## Fixes implemented

### Atomic open (layout-first, no opacity trap)

1. **Measure** with `.md-focus-modal-measuring` (visible but transparent backdrop).
2. **Validate** `#focusModal` is inside `#focusOverlay` and has width/height ≥ 40px (`isFocusModalLayoutValid` — **no opacity check**).
3. **Open** only after validation: add `.open`, `.md-focus-modal-ready`, `.md-focus-modal-instant` (disables transitions for first paint).
4. **Watchdog** (450ms): if layout invalid, `teardownFocusModalUi()` + toast.
5. **`try/catch`:** any failure → full `teardownFocusModalUi()` — never leave half-open state.

### Safe teardown (always works)

- `teardownFocusModalUi()` — removes `.open`, rescue classes, `md-focus-modal-open` on `body`, `aria-hidden` on portal, clears `focusNodeId`, clears watchdog.
- `closeFocusModal()` — syncs model when `focusNodeId` set; **always** calls teardown if overlay is open (even when `focusNodeId` is null).
- ESC: closes when overlay has `.open` **or** `focusNodeId` is set.
- `syncFocusModalOrphanGuard()` — called from `sanitizeSelectionState()`; closes overlay if open without valid focus node / DOM.

### CSS hardening

- `.focus-modal { pointer-events: none }` by default — invisible dialog does not steal clicks.
- `.open .focus-modal.md-focus-modal-ready` — `pointer-events: auto`.
- `.md-focus-modal-instant` — `transition: none` on open frame to avoid t=0 opacity false negatives.

### Undo path

`restoreSnapshot()` uses `teardownFocusModalUi()` instead of only clearing `focusNodeId`.

---

## Verified runtime flow

| Step | Action |
|------|--------|
| 1 | Click **Open extended editor…** → `resolvePrimarySelectedNodeId()` |
| 2 | `revealDiagramNodeInspectorAndOpenExtended(nodeId)` |
| 3 | `openFocusModal(nodeId)` → portal mount, DOM repair, populate fields |
| 4 | Measure → layout validate → add `.open` + instant class |
| 5 | Dialog visible above canvas; backdrop clickable; × and ESC close |
| 6 | On failure → teardown, toast, no orphan overlay |

### Automated checks (headless Chromium)

- Open: overlay open, modal width ~720px, opacity 1, pointer-events auto.
- `sanitizeSelectionState()` while open: remains valid (node still exists).
- ESC: overlay closed, `focusNodeId` null.
- Open/close ×5: no stuck overlay.
- Orphan simulation (`focusNodeId = null`, overlay open) → ESC closes overlay.

---

## Manual checklist

- [ ] Open / close repeatedly (×10)
- [ ] ESC, × click, backdrop click
- [ ] Open after zoom / pan
- [ ] Open after duplicate / undo / redo
- [ ] Delete focused node while modal open → overlay must close
- [ ] No scrim left after any failed open

---

## Rollback

```bash
git checkout -- app/tool.html
```

Revert: `teardownFocusModalUi`, `openFocusModal` try/catch, `syncFocusModalOrphanGuard`, CSS measuring/instant/ready classes.
