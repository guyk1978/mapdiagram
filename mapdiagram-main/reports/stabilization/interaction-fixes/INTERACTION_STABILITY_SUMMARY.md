# Interaction stability summary — overlays, grouping, duplication

Sprint scope: **`app/tool.html`** (plus **`assets/design-tokens.css`** for the shared z-index token used by the inspector).

## Changes at a glance

| Area | Change |
|------|--------|
| Extended inspector layering | `--z-focus-modal` → **10038**; overlay **`isolation: isolate`**; optional **`body`** mount for `#focusOverlay`. |
| Extended inspector sizing | Narrower **`max-width`**, lower **`max-height`**, tighter paddings; **`min-height: 0`** on panels for grid overflow; mobile **`dvh`/viewport-safe** caps. |
| Group selection | Invalidate **`groupBoxCache`** and **`renderSemanticOverlays`** (+ minimap) after **`ResizeObserver`** / **`syncNodeSizes`**. |
| Group duplicate | Duplicate **`branch-from`** edges when parent **node–node** edge duplicated; clear **node + edge + group-connection** selection before **`renderAll()`**. |

## Before / after behavior

- **Inspector overlay:** Previously relied on **`9999`**, below **toasts** and far below **raised** overlays; could feel “under” unrelated UI. Now **deterministically** above dock, chrome, auth, and toasts, but still **below** palette / import diff / other **`--z-modal-raised`** layers.
- **Inspector size:** Reduced from **`min(90vw, 1200px)`** / **`90vh`** class of footprint to **`min(92vw, 720px)`** / **`min(82vh, 640px)`** with a **shorter** scroll region for panels.
- **Group selection:** Resizing nodes no longer leaves **group hit targets** on **stale geometry**.
- **Duplicate group:** Branching connectors inside the subtree **follow** the duplicate; selection no longer references **ghost ids**.

## Validation checklist (manual)

- Open/close extended editor during **pan/zoom** and with **quick-edit** toolbars visible.
- **Resize** nodes inside groups; verify **group edges** remain clickable.
- **Duplicate** a group with **branch-from** links; repeat and **spam** duplicate; **undo/redo**.
- **Load/restore** project; select groups and nodes; confirm inspector and bars stay consistent.

## Regression risks

1. **Toasts under** extended inspector while open (z-order change).
2. **Extra overlay work** on resize-heavy graphs (group chrome + minimap).
3. **Duplication** still does not clone edges that cross the **subtree boundary** (by design).

## Rollback instructions

1. **design-tokens.css:** restore `--z-focus-modal: 9999`.
2. **tool.html:** revert CSS blocks for `.focus-modal-overlay`, `.focus-modal`, `.focus-head`, `.node-insp-panels`, mobile `.focus-modal` / `.node-insp-panels`; remove `focusOverlay` **`appendChild`**; revert `ResizeObserver` body; revert `duplicateUserGroup` **`connIdMap` / branch pass / selection clears**.

Keep this file with the three topic reports for audit trail.
