# Phase 1 — Compiler Boundary Report

**Scope:** `src/flowchart/**`, [`app/flowchart-compiler.js`](../../../app/flowchart-compiler.js) (build artifact metrics), [`vite.flowchart.config.ts`](../../../vite.flowchart.config.ts), [`tests/flowchart/compiler.test.ts`](../../../tests/flowchart/compiler.test.ts)

---

## 1. Public API surface (TypeScript exports)

**Entry:** [`src/flowchart/index.ts`](../../../src/flowchart/index.ts)

Exports include:

- Validation / graph helpers: `validateFlowchartSpec`, `forwardEdges`, `backEdges`, `computeForwardRanks`, `FLOWCHART_LIMITS`
- Normalization: `normalizeFlowchartSpec`, `coerceDraftSpec`
- Layout pipeline: `layoutFlowchart`, `beautifyFlowchartLayout`, `nodeDimensions`
- Compile: `compileFlowchartToCanvas`, `compileFlowchartPipeline`
- Retry + AI: `compileFlowchartSpecWithRetries`, `createMockFlowchartCompleter`
- Export round-trip: `exportCanvasToFlowchartSpec`
- Quality: `qualityScoreFlowchart`
- Prompts: `FLOWCHART_JSON_SYSTEM_PROMPT`, `userPromptForFlowchartAttempt`
- Reveal: `buildRevealPlan`
- **Billing gateway:** `completeOpenAiThroughBillingGateway`, `BILLING_RESERVE_CREDITS_PER_CALL` (from [`src/ai-service.ts`](../../../src/ai-service.ts))

**Browser global:** assigns `window.FlowchartCompiler` object (~L80–114 index.ts).

| Finding | Severity | Confidence | Evidence | Why it matters |
|---------|----------|------------|----------|----------------|
| Compiler bundle ships **network credential** consumer | **High** | High | `index.ts` L26–68 imports `completeOpenAiThroughBillingGateway` | Any XSS in editor increases blast radius for authenticated AI calls |
| Default + named export warning from Vite | **Low** | High | Build log (see BUILD_AND_TOOLING_REPORT) | Integration ambiguity |

---

## 2. Runtime contract (`tool.html`)

| Contract point | Evidence |
|----------------|----------|
| Lazy script load | `loadFlowchartCompilerScript` ~L7110+ |
| Global expectation | `window.FlowchartCompiler` ~L7153, L7219, L12650 |
| Failure mode | Rejects if global missing (`reject(new Error("FlowchartCompiler not on window"))`) |

**Not verified in Phase 1:** Exact `<script src="flowchart-compiler.js">` injection site vs pure lazy loader — grep shows loader only.

---

## 3. Bundle structure (observed build)

| Artifact | Size | Modules transformed |
|----------|------|---------------------|
| `app/flowchart-compiler.js` | 120.96 kB (~43 kB gzip) | 309 |

Implication: compiler pulls substantial dependency graph (dagre + pipeline + **ai-service**).

---

## 4. Cyclic / malformed graph handling

**File:** [`src/flowchart/flowchart-spec.ts`](../../../src/flowchart/flowchart-spec.ts)

| Rule | Evidence snippet |
|------|------------------|
| Forward acyclicity | `"forward flow must be acyclic (back-edges use meta.isBackEdge)"` (~L172) |
| Controlled cycles | `"complex cyclic cluster not allowed; use at most 2 controlled back-edges"` (~L193) |
| Raw cycles rejected | `"cycle detected without controlled back-edges"` (~L197) |

| Finding | Severity | Confidence | Why it matters |
|---------|----------|------------|----------------|
| Validation explicit for cycles | Low (positive) | High | Predictable reject vs silent hang |
| Edge cases need fuzz tests | **Medium** | Medium | Only fixture coverage today |

---

## 5. Determinism concerns

| Area | Severity | Confidence | Notes |
|------|----------|------------|-------|
| Layout (dagre) | **Medium** | Medium | Typically deterministic for fixed inputs; version pinning matters |
| IDs | **Medium** | High | Compiler receives `newId` factory from caller — determinism depends on editor |
| Retry pipeline | **Medium** | Medium | [`flowchart-retry.ts`](../../../src/flowchart/flowchart-retry.ts) — external AI non-deterministic by nature |

---

## 6. Crash risks (static assessment)

| Risk | Severity | Confidence | Location | Mitigation direction |
|------|----------|------------|----------|---------------------|
| `JSON.parse` on AI responses | **High** | High | [`src/ai-service.ts`](../../../src/ai-service.ts) L106 — `JSON.parse(raw)` after fetch | Guard + schema validation |
| Compile assumes validated spec | **Medium** | Medium | Pipeline callers must validate first — enforced in tests but not proven for all runtime paths |

---

## 7. Test coverage baseline

**File:** [`tests/flowchart/compiler.test.ts`](../../../tests/flowchart/compiler.test.ts)

| Observation | Detail |
|-------------|--------|
| Tests | **38** (Vitest) |
| Fixtures | 9 JSON golden files |
| Scope | Validator, layout, compile, retry mock, export round-trip, overlap geometry helpers |

**Gaps (Phase 2 candidates):**

| Gap | Severity |
|-----|----------|
| No automated tests for `tool.html` integration | **Critical** |
| No tests for Edge `ai-complete` contract | **High** |
| No fuzz/property tests on spec edges | **Medium** |

---

## 8. Line counts (`src/flowchart/*.ts`)

Approximate physical lines (PowerShell):

| File | Lines |
|------|-------|
| flowchart-spec.ts | 313 |
| flowchart-beautify.ts | 242 |
| flowchart-normalize.ts | 231 |
| flowchart-retry.ts | 195 |
| flowchart-compile.ts | 189 |
| flowchart-layout.ts | 63 |
| flowchart-export-spec.ts | 72 |
| flowchart-quality.ts | 76 |
| flowchart-reveal.ts | 41 |
| flowchart-prompts.ts | 47 |
| flowchart-label.ts | 53 |
| index.ts | 109 |

---

## 9. Remediation orientation (no code changes)

1. Split **`completeOpenAiThroughBillingGateway`** into optional entry (`flowchart-ai-gateway.ts`) so layout-only consumers stay smaller.  
2. Add **`npm run typecheck`** once test/tsconfig fixed.  
3. Contract tests: golden HTTP mocks for `ai-complete` response shape.
