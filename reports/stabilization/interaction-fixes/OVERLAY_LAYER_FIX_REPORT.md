# Overlay layer fix — extended node inspector (`focusOverlay`)

## Overlay layer audit

| Layer | Mechanism | Typical z-index | Notes |
|-------|-----------|-----------------|-------|
| Canvas (`#viewport`) | `transform` on `#viewport`, nodes `#nodes` z-index 5–6 | 1–6 | Does not compete with viewport-fixed UI numerically. |
| Floating chrome | Share dock (`--z-share-dock`) | 9990 | Below legacy inspector token. |
| **Extended inspector** | `#focusOverlay.focus-modal-overlay` — `position: fixed`, body-mounted | **`--z-focus-modal`** (updated) | Must sit above canvas chrome and dock. |
| Soft lock toast | `--z-softlock` | 10010 | Below updated inspector. |
| Auth / AI shell modals | `--z-modal` | 10020 | Below updated inspector. |
| Toasts | `--z-toast` | 10030 | Below updated inspector. |
| Raised overlays (palette, import diff, AI overlay CSS) | `--z-modal-raised` | 10040 | Still above inspector when needed. |

Stacking contexts:

- `#focusOverlay` already lived **outside** `#app`, so it did **not** inherit canvas pan/zoom transforms.
- Risk remained **ordering vs other fixed UI** and **token values** (inspector formerly sat at `9999`, sandwiched unevenly versus dock/toast/modals).

## Root cause

1. **`--z-focus-modal` (9999)** was lower than **`--z-toast` (10030)** and far below **`--z-modal-raised` (10040)**. Most “raised” dialogs were intentional; the mismatch vs toast/share/chrome made layering **feel arbitrary** when multiple overlays existed.
2. No **`isolation`** on the inspector overlay, so rare stacking-context interactions (promoted layers, siblings) could behave inconsistently across browsers.
3. Inspector was **not guaranteed** to be the last body-resident overlay before palette/import DOM—moving it avoids accidental paint-order ties.

## Minimal safe fix

**Files:** `assets/design-tokens.css`, `app/tool.html`

1. **`--z-focus-modal: 10038`** — strictly above `--z-drawer-panel`, `--z-sticky-topbar`, **`--z-share-dock`**, **`--z-softlock`**, **`--z-modal`**, and **`--z-toast`**, but **below** **`--z-modal-raised`** (command palette, import diff, etc.).
2. **CSS:** `isolation: isolate` on `.focus-modal-overlay`; **safe-area `padding`** + `box-sizing: border-box` so the modal is not clipped at notches.
3. **Runtime:** If `#focusOverlay` is not already on `document.body`, **`document.body.appendChild(focusOverlay)`** immediately after resolving DOM refs.

## Before / after (dimensions / layering)

| Aspect | Before | After |
|--------|--------|--------|
| Inspector z-index token | 9999 | 10038 |
| Below global toasts while open | Yes | No — inspector now paints above toast stack |
| Isolation / predictable stacking | Not set | `isolation: isolate` |
| Body mount guarantee | Implicit markup order | Explicit append to `body` when needed |

## Regression risks

- **Toasts** may appear **under** the extended inspector while it is open (new ordering vs `--z-toast`). Acceptable for a full-screen modal; if product requires toasts on top, introduce a dedicated “inspector + toast” sub-stack later.
- **Third-party scripts** that inject very high z-index widgets could still win; none are assumed in core `tool.html`.

## Rollback

1. In `assets/design-tokens.css`, restore `--z-focus-modal: 9999`.
2. In `app/tool.html`, revert `.focus-modal-overlay` rules (remove `isolation`, `padding`, `box-sizing`) and remove the `appendChild(focusOverlay)` bootstrap block.
