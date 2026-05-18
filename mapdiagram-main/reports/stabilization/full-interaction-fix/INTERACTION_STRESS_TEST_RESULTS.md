# Interaction stress test results

**Environment:** Code review + static validation (no automated browser harness in repo).  
**Date:** 2026-05-16  
**Build:** `app/tool.html` + `assets/design-tokens.css`

## Method

Manual test matrix derived from sprint requirements. Mark each scenario after loading `app/tool.html` in the diagram builder.

## Results matrix

| Scenario | Expected | Status | Notes |
|----------|----------|--------|-------|
| Open extended editor over dense graph | Modal above all nodes/groups | **Pending manual** | Portal + z-index 10038; verify in browser |
| Modal during zoom/pan | No transform inheritance | **Pending manual** | Portal outside `#viewport` |
| Rapid modal open/close ×20 | No stuck focus / ghost overlay | **Pending manual** | |
| Duplicate group ×5 rapidly | Distinct +40 offsets, no overlap | **Pending manual** | Offset reduced from 80→40 |
| Duplicate nested group | All frames visible | **Pending manual** | |
| Duplicate after undo/redo | Clean ids, selection on copy | **Pending manual** | `restoreSnapshot` clears caches |
| Group select after node resize | Hit edges align | **Pending manual** | ResizeObserver invalidates cache |
| Toolbar Duplicate vs canvas | Same behavior | **Pending manual** | |
| Save/load loop ×5 | Selection sanitized | **Pending manual** | `sanitizeSelectionState` on render |
| `md_debug_groups=1` during duplicate | Console warnings only, no throw | **Pending manual** | |

## Known remaining risks

1. **Cross-subtree edges** on duplicate — by design not cloned  
2. **Toast under inspector** — z-order tradeoff while modal open  
3. **Very large subtrees** — duplicate is O(n) synchronous; may frame-skip on huge graphs  
4. **No automated regression tests** — vitest does not cover `tool.html` DOM interactions yet  

## Recommended follow-up

- Add Playwright smoke: open focus modal, assert `focusOverlay.closest('#modal-root')`  
- Add unit test for `sanitizeSelectionState` if extracted to `assets/md-interaction-integrity.js`
