# Phase 1 — Monolith Discovery Report (`app/tool.html`)

**Method:** Line counts via PowerShell `Measure-Object`; pattern counts via ripgrep; spot-read of anchor lines.  
**Refactor:** None performed.

---

## 1. Scale metrics

| Metric | Value | Confidence |
|--------|-------|------------|
| Total lines (file) | **14,527** | High |
| `<script` tag occurrences | **11** | High |
| Main inline script block | **~3834–14993** (~**11,160** lines) | High (boundary lines from grep) |
| Top-of-file scripts | Head includes `theme-engine.js`, gtag, inline block starting ~L8 | High |
| `function foo()` declarations (regex `^\s*function\s+\w+`) | **100** | Medium (misses `const x = () =>` and methods) |
| `runtime.` references | **121** | High |
| `addEventListener` | **100** | High |
| `pushHistory` | **54** | High |
| `requestAnimationFrame` | **14** | High |
| `innerHTML` / `insertAdjacentHTML` | **31** | High |
| Case-insensitive `supabase` | **91** | High |
| `localStorage` / `sessionStorage` | **35** | High |
| `functions.invoke` | **2** | High |
| Direct `fetch(` in tool.html | **0** matches | High — networking likely via Supabase client + separate [`src/ai-service.ts`](../../../src/ai-service.ts) in compiler bundle |

---

## 2. Script load order (evidence)

From grep of `<script` in `tool.html`:

| Order | Asset | Approx line |
|-------|-------|-------------|
| External | `/assets/theme-engine.js` | ~5 |
| External | Google tag manager | ~7–8 |
| External | `/assets/supabase-config.js` | ~3826 |
| External | `/assets/ai-config.js` | ~3827 |
| External | CDN `supabase-js` UMD | ~3828 |
| External | `/shared/share-dock.js`, analytics, flowchart assets | ~3830–3833 |
| **Inline monolith** | Starts ~**3834** | Main editor logic |

---

## 3. Global state nucleus

**Location:** ~L3993–4032 (continues beyond)

```3993:4032:c:\mapdiagram\app\tool.html
  const runtime = {
    db: { projects: [], activeProjectId: null, shares: {} },
    selectedNodeId: null,
    selectedConnectionId: null,
    /** Phase 2: shift-click multi-select for `p.connections` edges (node–node + system bridges). */
    selectedConnectionIds: new Set(),
    editingNodeId: null,
    dragging: null,
    panning: null,
    connecting: null,
    previewPath: null,
    previewFrom: null,
    connectionUi: {},
    cpDragging: null,
    renderConnectionsRaf: null,
    collisionDebounceTimer: null,
    graphCache: null,
    graphCacheKey: "",
    layoutAnimating: false,
    fcConnEnterIds: null,
    fcAssistantPanelOpen: false,
    _fcAssistantOnboardFocused: false,
    fcToolbarInteracting: false,
    fcMultiBarInteracting: false,
    fcCanvasPick: null,
    fcDeleteConfirmOpen: false,
    spaceKeyHeld: false,
    selectedFlowGroupId: null,
    flowGroupDragging: null,
    semanticTypes: {},
    suggestions: [],
    virtualGroups: [],
    semanticDebounceTimer: null,
    semanticLayoutMode: false,
```

| Finding | Severity | Confidence | Why it matters |
|---------|----------|------------|----------------|
| Single `runtime` bag holds UI + diagram + networking hints | **High** | High | Hard to reason about invariants; race/stale state risk |
| Mixture of IDs, Sets, RAF handles, timers | **Medium** | High | teardown/order bugs on navigation/tab hide |

---

## 4. Boot sequence hotspot

**Location:** ~L14982–14992

```14982:14992:c:\mapdiagram\app\tool.html
  analyzeDiagramSemantics();
  initSupabase();
  bootstrapAuth();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (runtime.supabase && runtime.authUser) void syncAiWalletFromBackend();
  });
  window.addEventListener("focus", () => {
    if (runtime.supabase && runtime.authUser) void syncAiWalletFromBackend();
  });
```

| Finding | Severity | Confidence | Why it matters |
|---------|----------|------------|----------------|
| Wallet sync on focus/visibility | **Medium** | High | Extra network chatter; ordering vs auth readiness |
| Comment references `initSupabase` / normalized origin ~L4041 | **Low** | High | Edge fetch assumptions centralized — good; still buried in monolith |

---

## 5. Billing → Edge invocation hotspot

**Location:** ~L5335–5348

```5335:5348:c:\mapdiagram\app\tool.html
  async function startCreditPackCheckout(pack) {
    if (!runtime.supabase || !runtime.authUser) {
      alert("Log in first to buy credits.");
      return;
    }
    const { data, error } = await runtime.supabase.functions.invoke("billing-checkout", {
      body: { pack },
    });
    if (error || !data?.url) {
      alert(error?.message || data?.error || "Checkout unavailable. Deploy billing-checkout and set STRIPE_SECRET_KEY.");
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  }
```

| Finding | Severity | Confidence | Why it matters |
|---------|----------|------------|----------------|
| Only **two** `functions.invoke` callsites | Low | High | Attack surface enumerable |
| User-visible `alert` for failures | Low | Medium | UX/security info leakage risk |

---

## 6. Theme / storage hotspot

**Location:** ~L12878–12894

```12878:12894:c:\mapdiagram\app\tool.html
  function applyTheme(mode) {
    const m = mode === "light" ? "light" : "dark";
    if (window.MapDiagramTheme && typeof window.MapDiagramTheme.set === "function") {
      window.MapDiagramTheme.set(m);
    } else {
      if (m === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
      try {
        localStorage.setItem("mapdiagram-theme", m);
      } catch (_) {}
    }
```

---

## 7. Compiler bridge hotspot

**Locations:** ~L7110+, ~L7153, ~L7219, ~L12650 — `loadFlowchartCompilerScript`, `window.FlowchartCompiler`.

| Finding | Severity | Confidence | Why it matters |
|---------|----------|------------|----------------|
| Lazy load of `flowchart-compiler.js` | **Medium** | High | Runtime failure modes if script 404 or CSP-blocked |
| Tight coupling editor ↔ compiler global | **High** | High | Contract drift if bundle exports change |

---

## 8. Monolith risk matrix (audit zones)

Zone-specific evidence is **line-range oriented**; exhaustive subsection mapping would require Phase 2 line tagging.

| Zone | Severity | Confidence | Observation |
|------|----------|------------|-------------|
| Auth/session | **High** | Medium | `bootstrapAuth`, `initSupabase` at end of boot; full auth surface not traced line-by-line in Phase 1 |
| Save/load | **High** | Medium | Persistence scattered; `pushHistory` ×54 implies large undo surface |
| Publish/share | **High** | Medium | Share dock external script + publish handlers (~L12650+ region referenced by grep context) |
| Iframe messaging | **Medium** | High | **No** `postMessage` in `tool.html`; parent [`app/index.html`](../../../app/index.html) owns wildcard postMessage |
| Canvas interaction | **High** | High | `workspace.addEventListener("pointerdown"` etc. — central interaction |
| Zoom/pan | **Medium** | High | Viewport transforms + classes; perf-sensitive |
| Keyboard shortcuts | **Medium** | Medium | Document-level handlers (e.g. F2 flowchart rename region ~L14373+) |
| AI integration | **High** | High | Compiler bundle exports gateway; assistant UI in-page |
| Supabase access | **High** | High | CDN client + runtime.supabase |
| Rendering loop | **Medium** | High | `requestAnimationFrame` ×14; `renderConnections` RAF dedup patterns |
| Event system | **High** | High | 100 `addEventListener` — hotspots need Phase 2 grouping by target element |
| History/undo-redo | **High** | Medium | `pushHistory` heavily used |
| Export/import | **Medium** | Low | Not exhaustively counted — Phase 2 |
| Dialogs/modals | **Medium** | Medium | Multiple overlays (`fcDeleteConfirm`, auth modal refs) |
| Performance-sensitive paths | **High** | Medium | Pan/zoom + connection render + semantic overlays |

---

## 9. Coupling observations

| Coupling | Severity | Evidence |
|----------|----------|----------|
| Editor ↔ bundled compilers via `window.*` | **High** | `FlowchartCompiler`, `ArchitectureEngine` |
| Editor ↔ Supabase ↔ Edge functions | **High** | Inline + [`supabase/functions/*`](../../../supabase/functions/) |
| Duplicate interaction helpers in repo | **Medium** | [`scripts/fc-interaction-engine.js`](../../../scripts/fc-interaction-engine.js) vs [`scripts/fc-interaction-slim.js`](../../../scripts/fc-interaction-slim.js) vs inlined logic — **risk of drift** (not verified which script ships in `tool.html`) |

---

## 10. Hidden state observations

| Finding | Severity | Confidence |
|---------|----------|------------|
| `runtime.pointers` Map (~L4031+) | Medium | High — multi-touch/pinch state |
| `connectionUi` mutation during CP drag | Medium | High |
| Multiple “clear interaction” helpers (`clearFcInteractionState`) | Medium | Medium — scattered lifecycle |

---

## 11. Complexity observations

| Observation | Severity |
|-------------|----------|
| Single file spans product vertical (diagram + billing + AI + flowchart) | **Critical** |
| High functional density (100+ function declarations) | **High** |
| Mixed abstraction levels (DOM queries adjacent to business rules) | **High** |

---

## 12. Remediation orientation (Phase 2+ — not executing)

1. Generate automated **symbol map** (functions → approximate line ranges) via AST or structured extraction.  
2. Split **network/auth** layer behind a thin façade module (even if bundled).  
3. Add **Playwright smoke** for load editor + compile path + publish mock.
