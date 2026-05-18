# Group control surface

## Motivation

Canvas-only group interactions (thin hit edges, label bar) are fragile when geometry or caches drift. A **secondary control surface** provides deterministic recovery without redesigning the editor.

## Top toolbar (`#topbarGroupSelActions`)

Visible when a group is selected (`syncTopbarGroupActions`):

| Control | Action |
|---------|--------|
| Duplicate | `duplicateGroupBtn.click()` |
| Ungroup | `ungroupSelectedGroupBtn.click()` |
| Focus | `groupFocusModeBtn.click()` |
| Forward | `bumpSelectedGroupsZIndex(+1)` |
| Back | `bumpSelectedGroupsZIndex(-1)` |

## Inspector panel (`#groupControls`)

| Addition | Purpose |
|----------|---------|
| `#groupChildCountLine` | Shows node + group counts in subtree |
| `#groupPinChk` | Toggles `g.pinned` / `g.locked` |
| Forward / Back buttons | Same z-order bump as toolbar |
| Shorter button labels | Duplicate / Focus / Ungroup |

Existing fields retained: name, color, parent select, delete group+nodes.

## Regression risk

Toolbar clutter on narrow desktop when group + connection toolbars both visible — both use `hidden` until relevant selection.

## Rollback

Remove `#topbarGroupSelActions` HTML/CSS and `syncTopbarGroupActions`; revert inspector panel to prior buttons only.
