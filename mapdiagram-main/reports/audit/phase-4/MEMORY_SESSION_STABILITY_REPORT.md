# Phase 4 — Memory & Session Stability Audit

**Primary:** `app/tool.html` — undo stacks, autosave, caches, observers, global listeners.

---

## Memory Risk Matrix

| Source | Severity | Confidence | Growth pattern | Evidence |
|--------|----------|------------|----------------|----------|
| **Undo history (`deepCopy` × 120)** | **Critical** | High | Linear in **projects × diagram JSON size** | ~5496–5508: full `nodes`, `connections`, groups, `flowGroups`, `view` cloned via `JSON.parse(JSON.stringify)` (~3991) |
| **`saveDB` / localStorage** | **High** | High | Whole `runtime.db` stringified | ~5049–5050 — quota exceptions **not handled** here |
| **`runtime.connectionUi`** | Medium | Medium | Map keyed by connection id; pruning on render (~10021–10022) | Leaks if prune misses branch kinds — watch long sessions |
| **`runtime.graphCache` / `groupBoxCache`** invalidated on `markDirty` | Low | High | ~5064–5067 clears references — avoids stale growth | Positive |
| **Semantic debounce timers** | Low | High | Single timer slots (~7782–7784) | Bounded |

---

## Session Stability Findings

### MS-1 — Undo stack retains 120 full snapshots

- **Severity:** Critical  
- **Confidence:** High  
- **Lines:** ~5499–5508  

```javascript
    runtime.undo.push(deepCopy({
      nodes: p.nodes,
      connections: p.connections,
      userGroups: p.userGroups || [],
      groupConnections: p.groupConnections || [],
      flowGroups: deepCopy(p.flowGroups || []),
      view: p.view
    }));
    if (runtime.undo.length > 120) runtime.undo.shift();
```

- **Runtime impact:** Memory ∝ **120 × serialized diagram**. Large diagrams (hundreds of nodes, rich media fields) → **multi‑100MB heaps**, GC pauses, tab churn.  
- **User-visible symptom:** Tab slows after intensive editing; possible browser kill on low-RAM devices.  
- **After 30 min / 2 h:** Depends on edit rate, not wall clock — burst editors exhaust RAM faster.  
- **Remediation:** Structural sharing / patch-based history; lower cap for large payloads; persist undo outside heap (IndexedDB) optional.

### MS-2 — `redo` cleared on every `pushHistory`

- **Severity:** Low (UX not memory)  
- **Confidence:** High — ~5508 standard behavior.

### MS-3 — `restoreSnapshot` full `renderAll` + graph recomputation

- **Severity:** Medium (CPU spike)  
- **Confidence:** High — ~5542–5553 calls `recomputeAllFlowGroupBounds`, `clearFcInteractionState`, `renderAll`.  
- **Symptom:** Long hitch on undo in huge diagrams.

---

## Leak Candidate Table

| Candidate | Likelihood | Notes |
|-----------|------------|-------|
| **`ResizeObserver`** on recreated nodes | Low–Medium | Destroying innerHTML clears elements; engines detach observers — **Not verified** across all browsers |
| **Document `pointermove`** (~13925+) | Low leak | Single listener; holds closures over `runtime` — intentional singleton |
| **Per-edge listeners** | Medium churn | Full `renderConnections` removes DOM — listeners go with nodes **unless** stray refs — monitor |
| **`pathWorldPointAtPoint`** temp SVG (~9287–9307) | Low | Removes path in try/finally — OK |

---

## Long-Session Degradation Risks

| Scenario | Expected degradation | Mechanism |
|----------|---------------------|-----------|
| Many undo operations | RSS climbs until cap shift drops oldest | Alloc + GC fragmentation |
| Repeated save/load cycles | Same — duplicates strings in undo | JSON clones |
| Very large diagrams | Autosave stringify stalls main thread | ~5070–5072 `saveDB` synchronous |
| Public view (`readOnly`) | `pushHistory` early-out (~5497) — **reduces** undo pressure | Positive |

---

## Undo / History Memory Risks

**Excluded from snapshots (Phase 2 note):** `runtime.connectionUi` — undo may deselect curve overrides inconsistently; **memory** unaffected but **correctness** elsewhere.

---

## localStorage / quota

- **`markDirty`** increments fc edit counter ~5058–5059 — tiny.  
- **`saveDB`** writes entire DB — **failure mode:** `QuotaExceededError` uncaught → potential silent broken persistence (**Not verified** — depends on surrounding try/catch at call sites).

---

## Recommendations

1. Implement **diagram-size-aware** history policy (cap snapshots by estimated JSON bytes).  
2. Wrap **`localStorage.setItem`** in try/catch with user-visible recovery + export prompt.  
3. Lazy **`renderProjects`** — avoid calling from hot paths when project list unchanged (cache dirty flag).

---

## Limitations

No heap snapshots or `performance.memory` captures — leak likelihood is **static**. Recommend Chrome detached heap comparison after 500 undo ops.
