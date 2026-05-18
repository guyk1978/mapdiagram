# Phase 4 — Production Readiness Audit

Synthesis of **runtime maturity** for shipping MapDiagram editor under real traffic — builds on Phases 2–3 where noted.

---

## Production Readiness Scorecard

| Dimension | Score (1–5) | Justification |
|-----------|-------------|---------------|
| Interactive performance (median diagram) | **3** | GPU pan/zoom OK; DOM/SVG rebuild costly |
| Large-diagram robustness | **2** | No caps / virtualization |
| Session persistence reliability | **3** | Autosave debounce OK; quota unhandled risk |
| Observability | **2** | Console logs; sparse correlation IDs (Phase 3) |
| Payment edge correctness | **2** | Stripe webhook acknowledgment flaws (Phase 3) |
| Security hardening | **2–3** | XSS vectors flagged Phase 2 |
| Deploy reproducibility | **3** | Requires explicit compiler bundle builds |

---

## Operational Risk Matrix

| Risk | Severity | Operational trigger | Mitigation gap |
|------|----------|---------------------|----------------|
| Main-thread long tasks | High | Import large JSON / resize observers | No watchdog / “slow render” telemetry |
| Tab OOM | High | Heavy undo + huge diagrams | No safeguards |
| Support debugging | Medium | User reports “slow” | No trace IDs on client actions |
| CDN stale **`flowchart-compiler.js`** | Medium | Deploy partial artifacts | CI doesn’t gate bundle freshness (**recommended**) |

---

## Supportability Risks

| Nightmare scenario | Why hard |
|--------------------|----------|
| “Lost my diagram” | localStorage opaque; versioning unclear |
| “Paid no credits” | Phase 3 webhook 200-on-failure |
| “Undo broke grouping” | Overlay state excluded from snapshots |

---

## Monitoring Gaps

- No client-side **error beacon** for uncaught exceptions in production bundle.  
- No histogram for **`renderConnections` duration**.  
- No **Core Web Vitals**-style field data tied to diagram size.

---

## Incident-recovery weaknesses

| Weakness | Impact |
|----------|--------|
| Immutable publishes accumulate rows | Manual cleanup / abuse |
| No feature flag around orthogonal routing | Cannot degrade gracefully remotely |

---

## Deploy / rollback readiness

- Static **HTML + JS** — rollback = CDN revert — **good**.  
- **Supabase migrations** irreversible RPC replaces — ops must forward-fix (**Phase 3**).

---

## Graceful degradation (missing)

| Desired behavior | Current |
|------------------|---------|
| Disable orthogonal routing under load | Partial heuristic density (~9323) |
| Disable minimap automatically when FPS low | Absent |
| Offer “lite renderer” | Absent |

---

## Recommendations (ops)

1. Add **client error reporting** (Sentry/OpenTelemetry) with diagram stats `{ nNodes, nEdges }`.  
2. Ship **`performance.measure`** behind debug flag → aggregate in analytics.  
3. Document **support playbook**: export JSON recovery path.

---

## Limitations

No SLO definitions in repo — scoring subjective.
