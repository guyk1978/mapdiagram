# Implemented Changes Log — Phase 5 Stabilization

All modifications are **incremental** and **reversible** via git revert per file.

---

## 1. `assets/md-runtime-diagnostics.js` *(new)*

**Why:** Centralized opt-in profiler (`performance.mark/measure`), counters, and `escapeHtml` helper — zero cost when disabled.

**Impact:** Debuggability ↑; enables future hooks without growing `tool.html` further.

**Rollback:** Delete file + remove `<script src>` from `tool.html`.

**Risk:** Low.

---

## 2. `app/tool.html`

### 2a. Script include

**Why:** Load diagnostics before main bundle logic.

**Rollback:** Remove one `<script>` line.

### 2b. `runtime.nodeElById` + `getNodeDomEl`

**Why:** Avoid repeated `querySelector` during drag/layout/theme updates.

**Rollback:** Remove map + helper; restore `nodesLayer.querySelector` calls.

**Risk:** Low–medium — mitigated by `isConnected` fallback.

### 2c. ResizeObserver RAF + deferred `markDirty`

**Why:** Reduce layout/paint storms + autosave churn during text-driven resizes.

**Rollback:** Restore synchronous three-line observer body.

**Risk:** Low — autosave delayed ≤160 ms during active resize only.

### 2d. `saveDB` try/catch + toast

**Why:** Quota / private mode failures must not fail silently.

**Rollback:** Restore single `setItem` without catch.

**Risk:** Low.

### 2e. `restoreSnapshot` — `selectedFlowGroupId` + `connectionUi` prune + profiler `try/finally`

**Why:** Undo/redo consistency (Phase 2 findings).

**Rollback:** Remove added lines inside `restoreSnapshot`.

**Risk:** Low.

### 2f. `renderProjects` DOM-safe construction

**Why:** Eliminate XSS sink (`innerHTML` with project name).

**Rollback:** Restore template string row.

**Risk:** Low.

### 2g. `renderNodes` cache population

**Why:** Feed `nodeElById`.

**Rollback:** Remove `clear/set` lines.

### 2h. `renderAll` profiler wrapper

**Why:** Measure full redraw cost when profiling enabled.

**Rollback:** Remove `try/finally` + profiler calls.

### 2i. Replace hot-path `querySelector` with `getNodeDomEl`

**Why:** Performance quick win.

**Rollback:** Mass revert of replacements (git recommended).

### 2j. `fcStartInlineRename` variable fix (`bodyEl`)

**Why:** Prior edit renamed body element inconsistently — **correctness fix** bundled with DOM lookup change.

**Rollback:** N/A — required for working rename.

### 2k. Unified `window.resize` listener

**Why:** Duplicate listeners removed; debounced combined handler.

**Rollback:** Restore `deskSbResizeTimer` block + separate bottom listener.

**Risk:** Low — behavior equivalent after ≤100 ms debounce.

---

## 3. `assets/flowchart-product.js`

### 3a. Publish POST timeout (`AbortController`, 90 s)

**Why:** Prevent indefinite hang; surface `publish_timeout`.

**Rollback:** Remove controller/signal + timeout branches.

**Risk:** Low.

### 3b. Public bootstrap GET timeout

**Why:** Same for iframe viewer fetch path.

**Rollback:** Restore parameter-less fetch.

### 3c. Template picker DOM nodes vs `innerHTML`

**Why:** XSS-harden catalog-driven markup.

**Rollback:** Restore string concatenation card HTML.

**Risk:** Low.

---

## 4. `src/ai-service.ts`

**Why:** AI gateway fetch timeout (**120 s**) — prevents hung promises on dead connections.

**Rollback:** Remove `AbortController` wiring.

**Risk:** Low — legitimate long completions still fit within 120 s window; tune constant if needed.

---

## 5. `package.json`

**Why:** Add `test:stabilization`; extend `test` script.

**Rollback:** Restore original `test` script only.

**Risk:** None.

---

## 6. `tests/stabilization/escape-html.test.ts` *(new)*

**Why:** Regression guard for escaping rules shared with diagnostics bundle.

**Rollback:** Delete file + npm script reference.

**Risk:** None.

---

## Explicit Non-Changes (Deferred)

- Stripe webhook HTTP semantics — needs idempotent RPC design first.
- Full `renderConnections` refactor — Phase 6 scope.
