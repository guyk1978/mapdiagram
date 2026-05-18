# Phase 4 — Performance Optimization Strategy

**Scope:** Actionable roadmap — **no implementation** in this audit.

Priorities ranked by ROI × safety × scalability unlock.

---

## Optimization Priority Matrix

| ID | Change | Est. impact | Complexity | Regression risk | Depends on |
|----|--------|-------------|------------|-----------------|------------|
| P1 | RAF-debounce **`ResizeObserver`** → coalesce `syncNodeSizes` + `scheduleRenderConnections`; omit `markDirty` until settle | High frame stability during label edits | Low | Low | None |
| P2 | Throttle **`paintMinimap`** out of **`updateViewport`** hot path (RAF / dirty flag) | Big win when minimap open + zoom | Low | Low | None |
| P3 | Build **spatial hash** / bounding-grid for obstacles — compute once per `renderConnections` pass | Cuts edge routing toward **O(E + N)** avg | Medium | Medium | None |
| P4 | Maintain **`Map<nodeId, HTMLElement>`** instead of `querySelector` per drag tick | Large multi-drag responsiveness | Medium | Medium | Small refactor |
| P5 | **Incremental SVG updates** — patch only changed edges | Unlock huge graphs | High | High | Solid dirty tracking |
| P6 | **Virtualize** off-screen nodes (pool DOM) | Massive scalability | Very high | Very high | Architecture split |
| P7 | **Byte-weighted undo** or patch history | RAM + GC stability | High | High | Serialization helpers |

---

## Performance Refactor Roadmap

### Phase A — Immediate wins (1–2 dev days)

1. Implement P1 + P2.  
2. Add **`performance.measure`** wrappers (staging-only flag).

### Phase B — Low-risk optimizations (sprint)

3. P3 obstacle index + reuse arrays (avoid per-edge `.filter` allocations).  
4. P4 node element cache invalidated on `renderNodes`.

### Phase C — Architectural optimizations (multi-sprint)

5. Split **`renderConnections`** into: model→geometry cache layer vs DOM bind layer (enables Worker offload later).  
6. **Viewport culling** for edges (skip geometry entirely when both endpoints outside padded viewport).

### Phase D — Scalability refactors (strategic)

7. P6 virtualization — only after contract stabilization (Phase 3 publish schema).  
8. P7 structural undo — aligns with Phase 2 integrity fixes.

---

## Scalability Upgrade Plan

| Milestone | Success metric |
|-----------|----------------|
| M1 | `renderConnections` p95 < 16 ms for **100 nodes / 120 edges** on reference laptop |
| M2 | Wheel-zoom FPS stable ≥55 with minimap on |
| M3 | Import **300-node** JSON without “Page Unresponsive” >500 ms stalls |

*(Benchmarks **not yet collected**.)*

---

## Safe Optimization Candidates

- P1, P2 (observer + minimap throttling).  
- Reduce **`renderSelection`** calls during connect preview (UX-3) — gate with dirty flags.

---

## High-Risk Optimization Areas

| Area | Risk |
|------|------|
| Incremental SVG | Selection/hit-testing desync |
| Worker geometry | Serialization overhead may negate gains for small graphs |
| Removing full `renderNodes` | Event listener regressions |

---

## Dependency notes

- **P5/P6** benefit from Phase 3 **snapshot schema versioning** (predictable minimal fields).  
- **Stripe/webhook fixes** (Phase 3) unrelated but unblock prod trust — parallel track.

---

## Verification protocol (when implementing)

1. Chrome Performance: record **drag**, **wheel zoom**, **bulk paste label**.  
2. Fixture JSON sizes: 50 / 150 / 400 nodes scripted import.  
3. Memory: heap snapshot diff after **200 undos**.
