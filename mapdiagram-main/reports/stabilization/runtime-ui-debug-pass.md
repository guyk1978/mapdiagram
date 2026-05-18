# Runtime UI debug pass

**Date:** 2026-05-16  
**Target:** `app/tool.html`  
**Goal:** Fix broken user-facing flows (extended editor modal, group controls), not add more infrastructure.

---

## Broken runtime paths (root cause)

### Issue 1 — Extended editor does not appear

| Step | Expected | Actual failure |
|------|----------|----------------|
| Click **Open extended editor…** | Handler runs → modal visible | Often OK |
| `openFocusModal()` | Adds `.open`, shows overlay | **Threw or no-op** if `focusColor`/`focusShape` null; **invisible** if portal CSS broke stacking |
| Portal CSS | Fixed overlay covers viewport | **`contain: layout style` on `.md-modal-root`** made `position: fixed` descendants unreliable |
| Selection | Uses selected node | Button only checked `runtime.selectedNodeId`, not `selectedNodeIds` (multi-select) |

**Primary fixes:**
- Removed `contain: layout style` from `.md-modal-root`.
- Added `visibility` on `.focus-modal-overlay` open/closed states.
- Null-safe `focusColor` / `focusShape` / `focusOverlay` / `focusModal` / `focusCloseBtn` usage.
- `resolvePrimarySelectedNodeId()` for the open button.
- `aria-hidden` on `#modal-root` toggled when modal opens/closes.

### Issue 2 — Group controls not visible

| Step | Expected | Actual failure |
|------|----------|----------------|
| Select group on canvas | `selectedGroupId` set | In **flowchart mode**, `#semantic-overlays` was **`display: none !important`** → no group chrome, **no selection** |
| Top toolbar | Show Duplicate / Ungroup / Focus | `.topbar-group-actions { display: none }` + `hidden` attribute; **`is-visible` class never toggled** (only `hidden` was set) |
| Inspector **Groups** tab | Show `#groupControls` | **`#diagramSubTabGroups` hidden** in flowchart; sub-panel never got `diagram-sub-on` |

**Primary fixes:**
- Flowchart: stop hiding `#semantic-overlays` and `#diagramSubTabGroups`; hide only `.semantic-group` virtual overlays.
- Flowchart: `.group-controls.active { display: grid !important }`.
- `syncTopbarGroupActions()` toggles **`.is-visible`** (CSS `display: inline-flex !important`).
- `applyUserGroupSelection()` calls **`applyDiagramSubTab("groups")`**.
- Top bar labels: **Duplicate Group**, **Ungroup**, **Focus Group** (mobile copies on narrow viewports).

---

## Fixes applied (integration, not new architecture)

### Extended editor
- CSS portal: no `contain`; visibility on overlay.
- `openFocusModal`: guards, `modalRoot` aria, body class `md-focus-modal-open`.
- `openExtendedEditorBtn`: `resolvePrimarySelectedNodeId()`.
- Event listeners: optional chaining so one null ref does not break the script tail.

### Group controls
- Flowchart CSS: user group frames + Groups inspector tab enabled.
- Top toolbar wired via `.is-visible`.
- Mobile: `#mobileDupGroupBtn`, `#mobileFocusGroupBtn` when group selected.
- Inspector: existing `#groupControls` + child count + Duplicate on **Groups** sub-tab.

---

## DOM notes (expected after fix)

```
body
  #modal-root          ← portal (aria-hidden=true when closed)
    #focusOverlay.focus-modal-overlay.open   ← after mountIntoModalRoot
  #app
  …
  #focusOverlay        ← original markup position (moved at runtime)
```

After init, `#focusOverlay` should be the only child of `#modal-root`.

When open:
- `#focusOverlay` has class `open`, `opacity: 1`, `pointer-events: auto`.
- `#focusModal` inside has `opacity: 1` (`.focus-modal-overlay.open .focus-modal`).

---

## Automated smoke check (2026-05-16)

Headless Chromium against `app/tool.html` (local static server):

| Check | Result |
|-------|--------|
| `#focusOverlay` child of `#modal-root` | Pass |
| After `openFocusModal`: `.open`, opacity 1, visible, pointer-events auto | Pass |
| After group select: `#topbarGroupSelActions.is-visible`, display flex | Pass |
| `#groupControls.active`, display grid, Groups sub-tab on | Pass |

---

## Manual verification checklist

### Extended editor
1. Select a node → **Open extended editor…** → modal appears above canvas.
2. Close (× or backdrop) → modal hides.
3. Repeat 5×; zoom/pan while open.
4. Multi-select one node → open still works.

### Group controls
1. Create group (Groups tools or template).
2. Click group frame label/edge → top bar shows **Duplicate Group | Ungroup | Focus Group**.
3. Inspector → **Groups** tab → name, child count, Duplicate.
4. **Duplicate Group** → copy offset; original unchanged.

---

## Remaining risks

| Risk | Mitigation |
|------|------------|
| Top bar group actions only in `.topbar-desktop-quick` (≥1025px) | Mobile buttons added |
| `userGroups` vs `flowGroups` in flowchart | This pass targets **userGroups** (systems); flow-group FAB unchanged |
| Very large projects: duplicate still synchronous | Existing behavior |

---

## Rollback

```bash
git checkout -- app/tool.html
```

Revert these sections if needed:
- `.md-modal-root` / `.focus-modal-overlay` visibility CSS
- Flowchart rules at `~2410` (semantic-overlays / diagramSubTabGroups)
- `.topbar-group-actions.is-visible`
- `syncTopbarGroupActions`, `resolvePrimarySelectedNodeId`, `openFocusModal` guards
