# Phase 2 — Monolith Extraction Plan (Roadmap Only — No Rewrite)

**Constraint:** Do **not** rewrite `tool.html` in this audit phase. This document sequences **incremental extraction** based on Phase 2 coupling findings.

---

## 1. Dependency zones (approximate line anchors)

| Zone | Approx range | Responsibility | Fan-out |
|------|----------------|----------------|---------|
| Z-Boot | ~3826–3857 | External scripts, globals | CDN Supabase, configs |
| Z-RuntimeCore | ~3990–5055 | `runtime`, helpers, dirty persistence | Everything |
| Z-SupabaseAuth | ~5078–5478 | Client init, wallet, cloud sync, bootstrap | Network |
| Z-History | ~5496–5630 | Undo/redo | Project graph |
| Z-CanvasRender | ~9589–12165 | Viewport, zoom, renderAll stack | DOM/SVG |
| Z-Interactions | ~5680–8700 | Drag, pan, connect, groups (sprawls) | Events + render |
| Z-SVGConnections | ~9000–10650 | Edge routing, hits | Geometry |
| Z-FlowchartProduct | ~12685–12765 | Publish / templates | External JS module |
| Z-EventsGlue | ~13354–14680 | Document listeners, workspace wheel | Global IO |

---

## 2. Extraction candidate map

| Candidate module | Current coupling | Extraction difficulty | Regression risk |
|-------------------|------------------|----------------------|-----------------|
| **Persistence adapter** (`loadDB/saveDB/markDirty/cloudSync`) | Touches indicator UI strings | Medium | High |
| **History manager** (`pushHistory/restoreSnapshot`) | Calls `renderAll`, `clearFcInteractionState` | Medium | **High** |
| **Supabase service façade** | Mixed UI alerts | Medium | High |
| **Render scheduler** (`scheduleRenderConnections`, `renderAll`) | Imports DOM refs | High | **Critical** |
| **Interaction controller** | Reads/writes runtime + DOM | Very High | Critical |
| **FlowchartCompiler bridge** | Already lazy-loaded | Low | Medium |

---

## 3. Incremental refactor plan (staged)

### Phase E1 — Safe seams (low regression)

1. Extract **pure helpers**: geometry (`world`, `anchor`, etc.) → `editor/geometry.ts` compiled/bundled separately **without** touching call sites initially — duplicate then swap.
2. Central **escapeHtml** + replace **project list innerHTML** (security unblock).

### Phase E2 — Persistence façade

1. Move `loadDB/saveDB/markDirty` into module returning `{ subscribe }` hooks for UI indicators via callbacks injected from thin bootstrap.

### Phase E3 — History integrity fix pack

1. Fix undo/redo snapshot completeness (`connectionUi`, flow selection) **before** moving files — reduces behavioral drift during extraction.

### Phase E4 — Render pipeline split

1. Split `renderNodes` vs `renderConnections` scheduling behind `RenderCoordinator` with explicit dirty flags — requires profiling harness first.

### Phase E5 — Interaction extraction (long horizon)

1. Isolate pointer state machine — only after E4 stabilizes metrics.

---

## 4. Regression risk matrix

| Change | Likelihood of subtle regression | Mitigation |
|--------|----------------------------------|------------|
| Undo snapshot completeness fix | Medium | Golden undo tests (manual scripted) |
| Removing innerHTML XSS | Low | Snapshot DOM tests |
| Splitting render functions | High | Pixel snapshot / DOM count assertions |
| Moving Supabase calls | Medium | Mock Supabase client |

---

## 5. Safest extraction order

1. **Security hotfix strings** (no architectural move).  
2. **History snapshot correctness** (state layer).  
3. **Persistence façade** (networking boundary clarity).  
4. **ResizeObserver batching** (perf isolation).  
5. Geometry pure functions.  
6. Renderer coordinator.  
7. Interaction controller last.

---

## 6. Tooling prerequisites before extraction

- Playwright harness: load editor, create node, undo/redo, publish mock.  
- Performance baseline trace saved to CI artifact optional.

---

## 7. Explicit non-goals

- Migrating entire editor to React/Vue short-term — cost exceeds validated ROI without harness.
