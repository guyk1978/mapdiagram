# Phase 5 — Runtime Instrumentation Report

## Instrumentation Map

| Signal | Location | Trigger |
|--------|----------|---------|
| **`renderAll` duration | `app/tool.html` `renderAll()` | Performance marks when profiler enabled |
| **`resizeObserver` batch work | `ResizeObserver` RAF callback | Marks sync sizes + scheduled edges |
| **`undo_restoreSnapshot` | `restoreSnapshot()` | try/finally ensures measure completes |
| **`saveDB` counters | `saveDB()` | `saveDB_ok` / `saveDB_err` when profiler on |

## Timing Hook Inventory

| API | Module | Notes |
|-----|--------|-------|
| `MDRuntimeProfiler.markStart` / `markEnd` | `assets/md-runtime-diagnostics.js` | Uses `performance.mark` / `measure` |
| `perfEnabled()` | Same | URL `?mdPerf=1` **or** `localStorage.md_debug_perf === '1'` |
| `measureSync` / `measureAsync` | Same | Ready for future hooks (unused in HTML yet) |
| `counterInc` | Same | Used by `saveDB` success/failure |

## Debug Toggle Strategy

1. **Zero overhead default:** All profiler branches short-circuit when `perfEnabled()` is false (single try/localStorage read per call — negligible).
2. **Developer enable:** `localStorage.setItem('md_debug_perf','1')` + reload; **or** append `?mdPerf=1` to editor URL.
3. **Production spam:** Console logs from `markEnd` only when second argument is not `false`; hot paths (`renderAll`, resize observer, undo) pass **`false`** so logs stay quiet unless you change calls to verbose.

## Runtime Metrics Table

| Metric name (`performance.measure`) | Meaning |
|-------------------------------------|---------|
| `md:renderAll` | Full editor redraw pipeline |
| `md:resizeObserver` | One coalesced resize observation tick |
| `md:undo_restoreSnapshot` | Undo/redo snapshot apply + `renderAll` |

## Limitations / Next Steps

- Network timings for Supabase remain **uninstrumented** in `tool.html` (would duplicate Edge logs).
- Compiler lazy-load path not wrapped — add `measureAsync` around `compileFlowchartSpecWithRetries` consumer later.
