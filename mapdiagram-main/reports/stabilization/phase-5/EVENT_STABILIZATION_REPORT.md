# Phase 5 — Event Stabilization Report

## Event Cleanup Summary

| Change | Risk | Impact |
|--------|------|--------|
| **Merged duplicate `window.resize` listeners** into one debounced handler (~100 ms) | Low | Fewer redundant handler invocations during resize storms; desktop sidebar collapse + mobile drawer logic co-scheduled |

**Removed:** standalone `deskSbResizeTimer` listener (previously only called `applyDesktopSidebarCollapse`).  
**Integrated:** same call inside unified `mdWindowResizeDebounced` callback.

## Listener Risk Reductions

- **Duplicate registrations:** Eliminated second passive `resize` binding — single listener reduces ordering surprises.
- **ResizeObserver:** No leak fix yet; callbacks **batched** via `requestAnimationFrame` + deferred `markDirty` (see Rendering report).

## Input Responsiveness Improvements

| Area | Improvement |
|------|-------------|
| Resize-driven work | RAF-coalesced geometry sync + `scheduleRenderConnections` instead of synchronous full edge rebuild directly on every observer micro-task burst |
| Wheel | Unchanged intentionally (`passive: false` still required) |

## Remaining High-Risk Areas

- Document-level **`pointermove`** remains large — deferred architectural split (Phase 6).
- **`touchpreventDefault`** on workspace — still blocks native scroll when focused on canvas (product trade-off).
