# Overlay portal implementation

## Root cause

The extended node inspector (`#focusOverlay`) was a sibling of `#app` but not isolated in a dedicated portal layer. Prior z-index-only fixes could not guarantee paint order when:

- Other fixed UI (toasts, drawers, share dock) competed in the global stack
- Future DOM moves might place the overlay inside `#workspace` / `#viewport` (transform + `overflow: hidden` would clip or reorder it)

The failure mode “modal under canvas nodes” is consistent with **stacking-context containment**, not merely a low numeric z-index.

## Safe fix

### 1. Portal root (`#modal-root`)

```html
<body>
  <div id="modal-root" class="md-modal-root" data-md-portal-root></div>
  <div id="app">…</div>
</body>
```

(Implemented in `app/tool.html`; `#focusOverlay` is moved into `#modal-root` at runtime via `mountIntoModalRoot`.)

### 2. CSS (`app/tool.html` + `assets/design-tokens.css`)

| Token / rule | Purpose |
|--------------|---------|
| `--z-modal-root: 10035` | Fixed portal layer above canvas chrome |
| `.md-modal-root` | `position: fixed; inset: 0; isolation: isolate; contain: layout style; pointer-events: none` |
| `.focus-modal-overlay` | Lives inside portal; `position: fixed`; opens with `pointer-events: auto` |

### 3. Runtime mount (`mountIntoModalRoot` / `ensureFocusOverlayPortal`)

- On boot and every `openFocusModal()`, `#focusOverlay` is appended to `#modal-root`
- Forbidden ancestors: `#viewport`, `#workspace`, `#nodes`, `#connections`, `#canvas-underlays`, `#semantic-overlays`
- Debug: `localStorage.md_debug_groups = "1"` logs `portal-forbidden-ancestor` / `focus-inside-canvas`

### 4. Sizing (spec-aligned)

| Viewport | Width | Max height |
|----------|-------|------------|
| Desktop | `min(720px, 90vw)` | `82vh` |
| Mobile (≤1024px) | `96vw` | `90vh` |

Panels scroll inside `max-height: min(52vh, 420px)` (mobile `min(52vh, 380px)`).

## Regression risk

| Risk | Mitigation |
|------|------------|
| Toasts under inspector while open | Acceptable for full-screen modal; palette/import still at `--z-modal-raised` |
| Third-party widgets above portal | Out of scope; portal is last-resort for first-party modals |
| `appendChild` moves focus overlay in DOM | Event listeners remain on same element; no re-bind needed |

## Rollback

1. Remove `#modal-root` and `.md-modal-root` CSS
2. Remove `mountIntoModalRoot`, `ensureFocusOverlayPortal`, calls in init / `openFocusModal`
3. Restore `--z-focus-modal: 9999` if reverting token bump

## Validation checklist

- [ ] Modal over nodes and group chrome
- [ ] Stable during zoom / pan / drag / resize
- [ ] After undo/redo and JSON import
- [ ] Repeated open/close does not move overlay into `#viewport`
