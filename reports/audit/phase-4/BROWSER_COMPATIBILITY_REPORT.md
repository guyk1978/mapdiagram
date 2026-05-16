# Phase 4 — Browser & Platform Compatibility Audit

**Targets:** `app/tool.html`, `app/view.html`.

---

## Browser Risk Matrix

| Area | Mechanism | Risk | Severity | Confidence | Evidence lines ~ |
|------|-----------|------|----------|------------|------------------|
| Wheel zoom | `{ passive: false }` + `preventDefault` | Needed for zoom; **blocks scrolling** when pointer over workspace | Medium | High | ~14463–14467 |
| Touch | `preventDefault` on `touchstart`/`touchmove` | Native scroll/gesture interference | Medium | High | ~14663–14664 |
| **Clipboard publish** | `navigator.clipboard.writeText` | Requires secure context / permission — fails embedded contexts | Medium | Medium | publish ~12715 |
| **CSS `transform` pan/zoom** | GPU compositing | Generally solid; filters/blur stacking issues **Safari-specific not verified** | Low | Medium | ~9595 |
| **`ResizeObserver`** | Layout-driven callbacks | Older browsers unsupported — likely OK for Supabase-era targets | Low | Medium | ~4276 |

---

## Mobile Stability Findings

### BC-1 — Pinch vs wheel zoom ceiling mismatch

- **Severity:** Low  
- **Confidence:** High  
- **Evidence:** ~12149 vs ~14030 — different max zoom clamps.

### BC-2 — Small viewport + drawers

- **Severity:** Medium  
- **Confidence:** Medium — `isNarrowScreen` gates drawers (~9600+) — complex inspector + workspace overlap risk — **needs device QA**.

### BC-3 — `viewport` meta / iframe public view

- **Severity:** Low  
- **`view.html`** iframe full bleed (~122) — OK; **`tool.html`** inherits parent constraints.

---

## Input Compatibility Risks

| Input | Assumption | Fragility |
|-------|------------|-----------|
| **Pointer capture** | Used on handles (~10396+) | Safari historically buggy — **partially resolved modern Safari Not verified** |
| **Space key pan** | Document keydown (~14473+) | Typing detection helper — incorrect classification blocks shortcuts (**edge cases**) |
| **`elementFromPoint`** during connect | Uses mouse coords (~14093+) | Shadow DOM / scaled iframe offsets — broken hover rare |

---

## High-DPI / zoom

- Canvas minimap uses bitmap dimensions (`minimapCanvas.width`) — blurry on `devicePixelRatio` mismatch **possible** — **Not verified**.

---

## Accessibility-impacting behavior (performance-adjacent)

- Heavy main-thread stalls degrade screen reader responsiveness — correlated with large graphs (Phase 4 scalability).

---

## iframe behavior (`view.html` → `tool.html`)

- **Slug-based GET** caches row in `sessionStorage` (~177–178 view.html).  
- **Third-party cookie / storage partitioning** — unlikely issue same-origin — **Not verified**.

---

## Safari-specific checklist (Not verified)

Recommend manual QA: pinch-zoom stability, clipboard publish, passive wheel patterns on overlay elements.

---

## Cross-browser fragility summary

Highest fragility clusters: **touch + wheel interception**, **clipboard**, **SVG layout metrics (`getTotalLength`)**.
