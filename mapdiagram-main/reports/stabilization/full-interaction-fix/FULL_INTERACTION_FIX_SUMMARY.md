# Full interaction fix — executive summary

## Objective

Stabilize overlays, grouping, duplication, and selection in `app/tool.html` without rewriting the editor or changing save schema.

## What changed

### Section 1 — Overlay portal

- `#modal-root` at body root; `#focusOverlay` mounted via `ensureFocusOverlayPortal()`
- CSS isolation + token `--z-modal-root`
- Modal sizing per desktop/mobile spec

### Section 2 — Duplication

- Offset **40px** (constant `MD_GROUP_DUP_OFFSET`)
- `branch-from` edge remapping via `connIdMap`
- Full cache invalidation + bounds sync + selection reset

### Section 3 — Selection

- ResizeObserver refreshes group chrome when node sizes change
- `sanitizeSelectionState()` on render and critical mutations

### Section 4 — Control surface

- Top bar group actions (duplicate, ungroup, focus, z-order)
- Inspector: child count, pin, forward/back

### Section 5–6 — Assertions & caches

- `md_debug_groups` diagnostics
- `invalidateInteractionCaches`, `pruneNodeElCache`, integrity asserts

## Files touched

| File | Risk |
|------|------|
| `app/tool.html` | Medium — core runtime |
| `assets/design-tokens.css` | Low — new `--z-modal-root` |

## Success criteria (target)

| Criterion | Implementation status |
|-----------|------------------------|
| Extended editor above canvas | Portal architecture in place — **verify in browser** |
| Duplicated groups not corrupt | Hardened pipeline — **verify in browser** |
| Groups draggable / frames visible | Cache + overlay refresh — **verify in browser** |
| Selection reliable | Sanitize + geometry sync — **verify in browser** |

## Rollback (full sprint)

```text
git checkout -- app/tool.html assets/design-tokens.css
rm -rf reports/stabilization/full-interaction-fix/
```

## Related docs

- `IMPLEMENTED_RUNTIME_FIXES_LOG.md` — per-change log
- Topic reports: `OVERLAY_PORTAL_*`, `GROUP_*`, `CACHE_*`, `INTERACTION_STRESS_*`
