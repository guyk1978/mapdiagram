# Phase 1 — Build & Tooling Report

**Evidence date:** 2026-05-16  
**Commands executed:** `npm ci`, `npm run build:compilers`, `npm test`, `npx tsc --noEmit -p tsconfig.json`

---

## 1. Summary

| Check | Result |
|-------|--------|
| `npm ci` | **Pass** — 56 packages, `0 vulnerabilities` (npm advisory output) |
| `npm run build:compilers` | **Pass** with **1 Rollup/Vite warning** on flowchart bundle |
| `npm test` (Vitest) | **Pass** — 38 tests, 1 file |
| `npx tsc --noEmit` | **Fail** — Node builtins not typed for test file |

---

## 2. `package.json` scripts gap analysis

**File:** [`package.json`](../../../package.json)

| Script present | Purpose |
|----------------|---------|
| `build:flowchart` | Vite lib → `app/flowchart-compiler.js` |
| `build:arch` | Vite lib → `app/architecture-engine.js` |
| `build:compilers` | Both |
| `test` / `test:flowchart` | Vitest `tests/flowchart` |

**Missing (explicit detection):**

| Gap | Severity | Confidence | Why it matters |
|-----|----------|------------|----------------|
| No `lint` / `eslint` / `biome` | **Medium** | High | No enforced style/security rules on TS or HTML monolith |
| No `format` / Prettier | **Low** | High | Drift across contributors |
| No `typecheck` script wrapping `tsc` | **Medium** | High | Developers may not run `tsc`; CI absent anyway |
| No `npm audit` in CI | **Medium** | High | Advisory scan is manual |

---

## 3. TypeScript configuration

**File:** [`tsconfig.json`](../../../tsconfig.json)

```json
"include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
```

| Finding | Severity | Confidence | Evidence | Remediation |
|---------|----------|------------|----------|-------------|
| `tsc` fails on tests using Node APIs | **Medium** | High | Errors: `Cannot find module 'node:fs'`, `node:path`, `__dirname` in [`tests/flowchart/compiler.test.ts`](../../../tests/flowchart/compiler.test.ts) L1–3, L59 | Add `@types/node` + `"types": ["node"]` for tests, or split `tsconfig.test.json`; or use `vitest/globals` pattern |
| `skipLibCheck: true` | **Low** | High | tsconfig L8 | Faster builds; may hide dependency typing issues |

---

## 4. Vite build observations

### Flowchart compiler build

**Output (observed):**

- `app/flowchart-compiler.js` — **120.96 kB** (gzip ~42.97 kB), map ~594 kB  
- Log: **309 modules transformed**

| Finding | Severity | Confidence | Evidence | Why it matters |
|---------|----------|------------|----------|----------------|
| Named + default export warning | **Low** | High | Vite: *"Entry module is using named and default exports together... use FlowchartCompiler.default"* | Consumers expecting default-only IIFE may misuse API; `tool.html` uses `window.FlowchartCompiler` global — verify compatibility |
| Large source map | **Low** | High | `.map` ~594 kB | Debug/download cost; acceptable for dev |

### Architecture build

- `app/architecture-engine.js` — **15.87 kB** gzip ~6.29 kB  
- **3 modules transformed**

---

## 5. Vitest configuration

**File:** [`vitest.config.ts`](../../../vitest.config.ts)

- `include: ["tests/**/*.test.ts"]` only — **no coverage thresholds**, no projects split for browser vs node.

| Finding | Severity | Confidence | Why it matters |
|---------|----------|------------|----------------|
| Single test suite path | **Medium** | High | No tests for `tool.html`, Edge functions, or E2E |
| Vitest passes while `tsc` fails | **Medium** | High | Vitest/esbuild resolves Node types differently than `tsc` strict check |

---

## 6. CI / GitHub Actions

| Finding | Severity | Confidence | Evidence |
|---------|----------|------------|----------|
| No `.github/workflows` present in repo | **High** | High | Glob search returned **0** workflow files |

**Impact:** No automated gate on PRs for build, test, typecheck, or lint.

---

## 7. Blockers & non-blockers

| Item | Blocker for local dev? |
|------|-------------------------|
| `npm ci` | No |
| `build:compilers` | No (warning only) |
| `npm test` | No |
| `tsc --noEmit` | **Yes for strict CI-typecheck pipeline** until Node types fixed |

---

## 8. Recommended tooling additions (Phase 2 — not implementing now)

1. Add `npm run typecheck` → `tsc --noEmit` after fixing Node types for tests.  
2. Add minimal CI: `npm ci`, `npm run build:compilers`, `npm test`, `npm run typecheck`.  
3. Consider ESLint for `src/**/*.ts` + optional HTML plugin for `tool.html` inventory.  

---

## 9. Raw command excerpts (failure evidence)

**TypeScript (exit code 2):**

```
tests/flowchart/compiler.test.ts(1,30): error TS2307: Cannot find module 'node:fs' ...
tests/flowchart/compiler.test.ts(3,25): error TS2307: Cannot find module 'node:path' ...
tests/flowchart/compiler.test.ts(59,21): error TS2304: Cannot find name '__dirname'.
```

**Vite (warning only):**

```
Entry module "src/flowchart/index.ts" is using named and default exports together...
```
