# Phase 5 — Safe Extractions Report

## Safe Extractions Performed

| Artifact | Path | Purpose |
|----------|------|---------|
| Runtime diagnostics bundle | `assets/md-runtime-diagnostics.js` | Profiler API + `escapeHtml` helper — **pure IIFE**, no build step |

## Reduced Coupling Areas

- **`tool.html`** can gradually adopt `measureSync`/`measureAsync` without embedding profiler logic inline.
- Escape rules centralized for future UI list hygiene.

## Future Extraction Enablers

- Profiler module load order documented (`RUNTIME_INSTRUMENTATION_REPORT.md`).
- Node DOM resolution centralized in **`getNodeDomEl`** — candidate for moving to shared module when bundling strategy exists.

## Deferred High-Risk Refactors

- Splitting `renderConnections` / pointer engine — explicitly **out of scope** (Phase 6).
