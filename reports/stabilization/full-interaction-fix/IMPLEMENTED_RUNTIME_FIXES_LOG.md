# Implemented runtime fixes log

Sprint: **Full Interaction Integrity & Group Runtime Stabilization**  
Primary target: `app/tool.html`

---

## `assets/design-tokens.css`

| Change | Why | Risk | Rollback |
|--------|-----|------|----------|
| Added `--z-modal-root: 10035` | Dedicated stacking layer for portal | Low | Remove token |

---

## `app/tool.html` — HTML

| Change | Why | Risk | Rollback |
|--------|-----|------|----------|
| `#modal-root` after `<body>` | Portal host outside `#app` | Low | Remove node |
| `#topbarGroupSelActions` toolbar | Deterministic group ops | Low | Remove block |
| `#groupChildCountLine`, pin, Forward/Back in `#groupControls` | Inspector control surface | Low | Revert panel markup |

---

## `app/tool.html` — CSS

| Change | Why | Risk | Rollback |
|--------|-----|------|----------|
| `.md-modal-root` rules | Fixed portal, no transform inheritance | Low | Remove rules |
| `.focus-modal` sizing `min(720px,90vw)` / `82vh` | Spec compliance | Low | Restore prior sizes |
| Mobile `96vw` / `90vh` | Spec compliance | Low | Restore prior |
| `.topbar-group-actions`, `.group-meta-line` | Toolbar/panel layout | Low | Remove classes |

---

## `app/tool.html` — JavaScript

| Change | Why | Risk | Rollback |
|--------|-----|------|----------|
| Interaction integrity block (portal, caches, sanitize, assert) | Central runtime guards | Medium | Delete block + calls |
| `ensureFocusOverlayPortal()` on init + open | Real portal mount | Low | Remove calls |
| `MD_GROUP_DUP_OFFSET = 40` | Prevent overlap corruption | Low | Restore `OFF = 80` |
| `connIdMap` + branch-from pass in duplicate | Fix broken branch edges | Medium | Remove second pass |
| `syncStoredGroupBoundsForGroupIds` after duplicate | Frame regeneration | Low | Remove call |
| `invalidateInteractionCaches` on duplicate/undo/delete | Stale cache prevention | Low | Remove calls |
| ResizeObserver → invalidate group cache + `renderSemanticOverlays` | Selection hit-test sync | Medium | Revert observer body |
| `sanitizeSelectionState` in `renderSelection` | Prune ghost selections | Low | Remove calls |
| `syncTopbarGroupActions` / `syncGroupInspectorMeta` | UI sync | Low | Remove functions |
| `bumpSelectedGroupsZIndex` + button wiring | Z-order controls | Low | Remove handlers |
| `getNodeDomEl` disconnect cleanup | Stale DOM cache | Low | Revert 2 lines |

---

## Remaining risks

1. Browser verification still required for success criteria  
2. No automated DOM tests added  
3. Cross-subtree connections not duplicated (intentional)  

---

## Debug mode

```js
localStorage.setItem("md_debug_groups", "1");
// Reload tool — watch console for [md:groups:*] warnings
localStorage.removeItem("md_debug_groups");
```
