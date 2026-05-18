# Phase 4 — UX Reliability Audit

Focus on interaction correctness under stress, races, and recovery — **`app/tool.html`** primary; **`app/view.html`** + **`assets/flowchart-product.js`** for publish/view journeys.

---

## User Journey Reliability Matrix

| Journey | Reliability risk | Severity | Confidence | Evidence / symptom |
|---------|------------------|----------|------------|-------------------|
| Create diagram | Low | Low | High | Blank project path ~4282+ |
| Edit nodes | Medium | ResizeObserver↔render coupling | High | Typing triggers layout thrash (Phase 4 rendering LT-1) |
| Connect nodes | Medium–High | Hit-testing cost | Medium | `elementFromPoint` / targets during connect (~14093+) |
| Undo/redo | Medium | Snapshot omits overlays (Phase 2) | High | ~5499–5553 |
| Save | Medium | Async autosave vs cloud | Medium | ~5056–5075 debounce |
| Reload | Medium | localStorage corruption | Medium | ~5039–5046 parse fallback |
| Publish/share | Medium | Clipboard failures silent? | Medium | `publishFlowchart` ~12715 |
| Import/export | High | Large payload hangs | Medium | Full `renderAll` |
| Open shared | Medium | Cache staleness | High | `bootstrapPublicView` sessionStorage (~68–76 flowchart-product) |
| AI generate | Medium | Network/billing failures | High | Lazy compiler load ~7110–7121 |

---

## Interaction Failure Points

### UX-1 — Dragging nodes: `querySelector` per node per move

- **Severity:** Medium  
- **Confidence:** High  
- **Lines:** ~14002–14011  

```javascript
      for (const id of runtime.dragging.dragIds || [n.id]) {
        ...
        const el = nodesLayer.querySelector(`[data-node-id="${id}"]`);
```

- **Runtime impact:** Large multi-select drags lag — feels like “sticky” cursor.  
- **User-visible symptom:** Dropped frames during group moves.  
- **Scalability:** O(selection × moves/sec).

### UX-2 — Wheel zoom clamps vs pinch zoom clamps **differ**

- **Severity:** Low  
- **Confidence:** High  
- **`zoomAt`:** ~12149 clamps **max 2.2**  
- **Pinch:** ~14030 clamps **max 2.8**  
- **Symptom:** Users report inconsistent max zoom between touchpad and touchscreen.

### UX-3 — **`renderSelection`** invoked inside hot preview paths

- **Severity:** Medium  
- **Confidence:** High — connecting hover (~14063, ~14088, ~14108+) calls `renderSelection()` frequently.  
- **Symptom:** Selection chrome flicker / CPU during wire creation.

### UX-4 — Publish: **`navigator.clipboard`** may reject

- **Severity:** Medium  
- **Confidence:** Medium — HTTP contexts / permission prompts — errors surfaced via toast (~12721) — OK if `catch` branches complete.

### UX-5 — Public view iframe bootstrap failure

- **Severity:** Medium  
- **Confidence:** High — `initPublicViewIfNeeded` toast on catch (~12751–12752); parent may already showed error — duplicate UX possible.

---

## UI Consistency Risks

| Risk | Detail |
|------|--------|
| **`selectedFlowGroupId` after undo** | Phase 2: not cleared in `restoreSnapshot` — toolbar mismatch |
| **Read-only mode** | `runtime.readOnly` blocks history (~5497) — consistent |

---

## Recovery UX Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| **Autosave failure** | High | No explicit user toast if `localStorage` throws during save (**needs verification** at `saveDB` sites) |
| **Stale cloud overwrite** | High | Phase 2 / Phase 3 concurrent load |
| **Stripe / billing** | N/A here | Covered Phase 3 |

---

## Destructive Action Risks

| Action | Guard | Gap |
|--------|-------|-----|
| Project delete | `confirm` (~9641) | OK |
| Template blank apply | `pushHistory` first (~5559) | OK |
| Flowchart assistant delete confirm | Escape/Enter handlers (~14509+) | Modal focus traps **not audited** |

---

## Mobile interaction resilience

- **Workspace `touchmove` / `touchstart` `preventDefault`** (~14663–14664) — enables custom gestures but **blocks native scroll** inside workspace — can trap users if overlay UX wrong.  
- **`touchDragPending` threshold** ~10 px (~13931) — reduces accidental drags — positive.

---

## Limitations

Playwright journeys **not executed** — matrix from static reading.
