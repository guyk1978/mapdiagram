# Phase 4 — Large Graph Scalability Audit

Analysis of asymptotic cost and operational ceilings for large diagrams in **`app/tool.html`**, plus compiler constraints from **`src/flowchart`** where relevant.

---

## Scalability Threshold Table

| Scale | Nodes | Edges | Expected editor behavior | Confidence |
|-------|-------|-------|---------------------------|------------|
| **Typical AI flowchart** | ≤25 | ≤30 | Compiler-enforced (`FLOWCHART_LIMITS`) — comfortable | High |
| **Manual “large”** | ~80–150 | ~120–250 | Interaction degrades on **full edge rerender** + obstacle scans | Medium (estimated) |
| **100 nodes** | 100 | ~150 | Usable if orthogonal off / sparse edges; painful if dense + orthogonal | Medium |
| **500 nodes** | 500 | ~600+ | **Impractical** — DOM node count + `renderConnections` O(E×N) likely multi‑second stalls | High (extrapolated) |
| **1k+ nodes** | 1000+ | — | Tab instability (memory + layout); no hard editor cap found | Medium |

**Note:** Flowchart **compiler** caps nodes/edges for AI output; **manual canvas** does not inherit those caps automatically — scalability ceiling is **editor-defined**.

---

## Algorithmic Bottleneck Report

### AB-1 — Edge routing: **O(E × N)** obstacle preparation

- **Severity:** Critical at scale  
- **Confidence:** High  
- **File:** `app/tool.html`  
- **Evidence:** Per-connection `p.nodes.filter(...).map(...)` blocks (~10303–10309 and parallels).  

### AB-2 — `orthogonalPath`: **O(N)** obstacle scan × fixed tries

- **Severity:** Medium (bounded tries ≤5)  
- **Confidence:** High  
- **Lines:** ~9238–9258  

### AB-3 — Collision / semantic passes

- **`scheduleSemanticAnalysis`** → walks nodes + edges (~7828–7856+) — **O(N + E)** per debounced run — acceptable vs rendering.  
- **`smartRebalance` / BFS** (~9573–9583) — O(component) edges — invoked interactively — watch deep graphs.

### AB-4 — Minimap **`paintMinimap`**

- **O(N + G)** per invocation (~12081–12106 loops).  
- **`updateViewport`** always calls it (~9597), but **`paintMinimap` no-ops when minimap hidden** (~12067) → cost scales with pan/zoom frequency **only when minimap toggled on**.

---

## Complexity Growth Findings

| Operation | Complexity | Dominant term |
|-----------|------------|----------------|
| `renderNodes` | O(N) | DOM creation |
| `renderConnections` | **O(E × N)** | Obstacle vectors per edge |
| `fitToScreen` | O(N) | scans positions (~12171–12174) |
| Drag move (single selection) | O(1) DOM updates + **O(1)** scheduled reconnect | RAF batches reconnect |
| Multi-drag K nodes | **O(K)** querySelector updates (~14002–14011) | Linear in selection |
| Undo snapshot | O(size of diagram) | JSON clone |

---

## Large Graph Failure Risks

| Failure mode | Trigger | Symptom |
|--------------|---------|---------|
| Main-thread freeze | Single `renderAll` after import | Browser “Page Unresponsive” |
| **localStorage quota** | Huge project autosave | Data loss risk |
| GPU layer explosion | Thousands of DOM nodes | Mobile Safari kills tab (**Not verified**) |

---

## Compiler scaling (secondary)

| Stage | Limit | Notes |
|-------|-------|-------|
| Validation | O(V+E) graph checks | Tiny vs editor |
| Layout (dagre) | Dense graphs costly | Still far cheaper than DOM rerender for same graph |

---

## Scalability Readiness Assessment

**Current posture:** Optimized for **small/medium** diagrams (product aligns with AI limits). **No architectural guardrails** prevent users from importing massive JSON — worst-case paths hit **quadratic edge routing + full DOM rebuild**.

**Production readiness for enterprise-scale diagrams:** **Low** without virtualization or incremental rendering.

---

## Recommendations

1. Soft **warnings** when N or E exceed thresholds (import + paste).  
2. **Viewport culling:** skip rendering edges wholly outside viewport (except selection).  
3. Downgrade orthogonal routing to simple Bézier beyond threshold (`shouldUseOrthogonal` hints density ~9323 — extend).  
4. **Web Worker** path geometry for batches (long-term).

---

## Limitations

No synthetic benchmarks executed — thresholds conservative; Phase 5 should run scripted imports (100/300/500 nodes) with Performance recordings.
