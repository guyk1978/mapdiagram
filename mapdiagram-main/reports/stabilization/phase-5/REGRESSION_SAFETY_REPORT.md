# Phase 5 — Regression Safety Report

## New Regression Coverage

| Suite | Command | Coverage |
|-------|---------|----------|
| Flowchart compiler | `npm run test:flowchart` | Existing 38 tests unchanged |
| **Stabilization** | `npm run test:stabilization` | `tests/stabilization/escape-html.test.ts` — mirrors diagnostics escaping rules |

Root `npm test` now runs **both** suites (`package.json`).

## Critical Flow Protections

- **Escape parity test** guards accidental divergence between diagnostics helper and documented escaping expectations.

## Remaining Untested Risks

| Risk | Gap |
|------|-----|
| Undo + `connectionUi` pruning | No DOM harness |
| ResizeObserver batching | No synthetic layout integration test |
| `saveDB` quota path | Requires mocked `localStorage` or Playwright |

## Recommended Next Testing Layer

1. Playwright smoke: load editor → create node → undo → assert selection state.
2. Unit-test **`getNodeDomEl`** behavior with mocked `nodesLayer` — requires extraction to module.
