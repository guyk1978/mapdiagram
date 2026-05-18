/**
 * AI retry pipeline for FlowchartSpec.
 */
import {
  extractJsonObject,
  validateFlowchartSpec,
  type FlowchartSpec,
} from "./flowchart-spec";
import { coerceDraftSpec, normalizeFlowchartSpec } from "./flowchart-normalize";
import {
  FLOWCHART_JSON_SYSTEM_PROMPT,
  userPromptForFlowchartAttempt,
} from "./flowchart-prompts";

export type FlowchartCompleter = (system: string, user: string) => Promise<string>;

const DEFAULT_MAX_RETRIES = 2;

function fcLog(message: string, data?: Record<string, unknown>): void {
  try {
    console.info(`[MapDiagram][FlowchartCompiler] ${message}`, {
      ...data,
      t: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}

/**
 * Compile FlowchartSpec from AI with validation retries (max 3 attempts).
 */
export async function compileFlowchartSpecWithRetries(
  userPrompt: string,
  complete: FlowchartCompleter,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<FlowchartSpec> {
  let lastErrors: string[] = [];
  const attempts = maxRetries + 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    fcLog("attempt", { attempt: attempt + 1, attempts });
    const user = userPromptForFlowchartAttempt(userPrompt, attempt, lastErrors);
    const raw = await complete(FLOWCHART_JSON_SYSTEM_PROMPT, user);
    let parsed: unknown;
    try {
      parsed = extractJsonObject(raw);
    } catch (e) {
      lastErrors = [(e as Error).message || "JSON parse failed"];
      fcLog("parse failed", { errors: lastErrors });
      continue;
    }
    const first = validateFlowchartSpec(parsed);
    const draft = first.ok ? first.spec : coerceDraftSpec(parsed);
    const normalized = normalizeFlowchartSpec(draft);
    const v = validateFlowchartSpec(normalized);
    if (v.ok) {
      fcLog("validated", { nodes: v.spec.nodes.length, edges: v.spec.edges.length });
      return v.spec;
    }
    lastErrors = v.errors;
    fcLog("validation failed", { errors: lastErrors });
  }
  throw new Error(
    `Flowchart compiler exhausted ${attempts} attempt(s). Last errors:\n${lastErrors.join("\n")}`,
  );
}

/** Dev mock: returns fixture JSON from prompt keywords. */
export function createMockFlowchartCompleter(): FlowchartCompleter {
  return async (_system, user) => {
    const u = user.toLowerCase();
    if (u.includes("support") || u.includes("ticket")) return FIXTURE_SUPPORT;
    if (u.includes("bug") || u.includes("triage")) return FIXTURE_BUG_TRIAGE;
    if (u.includes("onboard")) return FIXTURE_ONBOARDING;
    if (u.includes("approval") || u.includes("review")) return FIXTURE_APPROVAL;
    if (u.includes("sign") || u.includes("funnel")) return FIXTURE_SIGNUP;
    return FIXTURE_LINEAR;
  };
}

const FIXTURE_LINEAR = JSON.stringify({
  version: 1,
  title: "Linear Onboarding",
  direction: "TB",
  nodes: [
    { id: "start", label: "Start", kind: "start" },
    { id: "signup", label: "Sign up", kind: "process" },
    { id: "verify", label: "Verify email", kind: "process" },
    { id: "welcome", label: "Welcome tour", kind: "process" },
    { id: "end", label: "Complete", kind: "end" },
  ],
  edges: [
    { from: "start", to: "signup" },
    { from: "signup", to: "verify" },
    { from: "verify", to: "welcome" },
    { from: "welcome", to: "end" },
  ],
});

const FIXTURE_APPROVAL = JSON.stringify({
  version: 1,
  title: "Approval Flow",
  direction: "TB",
  nodes: [
    { id: "start", label: "Start", kind: "start" },
    { id: "submit", label: "Submit request", kind: "process" },
    { id: "review", label: "Manager review", kind: "process" },
    { id: "approved", label: "Approved?", kind: "decision" },
    { id: "revise", label: "Revise", kind: "process" },
    { id: "complete", label: "Complete", kind: "end" },
  ],
  edges: [
    { from: "start", to: "submit" },
    { from: "submit", to: "review" },
    { from: "review", to: "approved" },
    { from: "approved", to: "revise", label: "No" },
    { from: "approved", to: "complete", label: "Yes" },
    { from: "revise", to: "review", meta: { isBackEdge: true } },
  ],
});

const FIXTURE_ONBOARDING = JSON.stringify({
  version: 1,
  title: "Employee Onboarding",
  direction: "TB",
  nodes: [
    { id: "start", label: "Start", kind: "start" },
    { id: "account", label: "Create account", kind: "process" },
    { id: "docs", label: "Submit documents", kind: "process" },
    { id: "training", label: "Complete training", kind: "process" },
    { id: "end", label: "Onboarded", kind: "end" },
  ],
  edges: [
    { from: "start", to: "account" },
    { from: "account", to: "docs" },
    { from: "docs", to: "training" },
    { from: "training", to: "end" },
  ],
});

const FIXTURE_SUPPORT = JSON.stringify({
  version: 1,
  title: "Support Escalation",
  direction: "TB",
  nodes: [
    { id: "start", label: "Start", kind: "start" },
    { id: "ticket", label: "Ticket opened", kind: "process" },
    { id: "triage", label: "Triage", kind: "process" },
    { id: "escalate", label: "Escalate?", kind: "decision" },
    { id: "l1", label: "L1 resolve", kind: "process" },
    { id: "l2", label: "L2 resolve", kind: "process" },
    { id: "end", label: "Closed", kind: "end" },
  ],
  edges: [
    { from: "start", to: "ticket" },
    { from: "ticket", to: "triage" },
    { from: "triage", to: "escalate" },
    { from: "escalate", to: "l1", label: "No" },
    { from: "escalate", to: "l2", label: "Yes" },
    { from: "l1", to: "end" },
    { from: "l2", to: "end" },
  ],
});

const FIXTURE_BUG_TRIAGE = JSON.stringify({
  version: 1,
  title: "Bug Triage",
  direction: "TB",
  nodes: [
    { id: "start", label: "Start", kind: "start" },
    { id: "report", label: "Bug reported", kind: "process" },
    { id: "repro", label: "Reproducible?", kind: "decision" },
    { id: "investigate", label: "Investigate", kind: "process" },
    { id: "close", label: "Close as invalid", kind: "process" },
    { id: "end", label: "Resolved", kind: "end" },
  ],
  edges: [
    { from: "start", to: "report" },
    { from: "report", to: "repro" },
    { from: "repro", to: "investigate", label: "Yes" },
    { from: "repro", to: "close", label: "No" },
    { from: "investigate", to: "end" },
    { from: "close", to: "end" },
  ],
});

const FIXTURE_SIGNUP = JSON.stringify({
  version: 1,
  title: "Sign-up Funnel",
  direction: "TB",
  nodes: [
    { id: "start", label: "Start", kind: "start" },
    { id: "land", label: "Landing page", kind: "process" },
    { id: "form", label: "Fill form", kind: "process" },
    { id: "valid", label: "Valid?", kind: "decision" },
    { id: "fix", label: "Fix errors", kind: "process" },
    { id: "end", label: "Account created", kind: "end" },
  ],
  edges: [
    { from: "start", to: "land" },
    { from: "land", to: "form" },
    { from: "form", to: "valid" },
    { from: "valid", to: "fix", label: "No" },
    { from: "valid", to: "end", label: "Yes" },
  ],
});
