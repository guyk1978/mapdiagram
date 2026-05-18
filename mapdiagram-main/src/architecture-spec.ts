/**
 * MapDiagram Architecture Compiler — structured spec only (no free-text diagrams).
 */

export { BILLING_RESERVE_CREDITS_PER_CALL, completeOpenAiThroughBillingGateway } from "./ai-service";
export type { BillingGatewayConfig } from "./ai-service";

export type PrimaryOptimizationGoal =
  | "latency"
  | "consistency"
  | "cost"
  | "simplicity"
  | "scalability";

export type ArchitectureNodeRole =
  | "client"
  | "gateway"
  | "service"
  | "data"
  | "process"
  | "external"
  | "other";

export interface ArchitectureNode {
  id: string;
  label: string;
  role: ArchitectureNodeRole;
  /** Why this box exists in THIS design (not a generic definition). */
  rationale: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ArchitectureDecision {
  /** Explicit design choice made. */
  choice: string;
  whatYouGain: string;
  whatYouLose: string;
  whatBreaksBecauseOfThis: string;
}

export interface RejectedAlternative {
  option: string;
  reasonRejected: string;
}

export interface ArchitectureSpec {
  goal: PrimaryOptimizationGoal;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  decisions: ArchitectureDecision[];
  sacrifices: string[];
  rejectedAlternatives: RejectedAlternative[];
}

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  type: string;
  color: string;
  shape: string;
  /** When set, MapDiagram must not apply auto-layout grids or collision nudges to this node. */
  layoutMode?: "graph";
  style: {
    opacity: number;
    glow: number;
    shadow: number;
    radius: number;
    borderColor: string;
  };
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  kind?: string;
}

export interface DiagramPayload {
  title: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
}

const GOALS: PrimaryOptimizationGoal[] = [
  "latency",
  "consistency",
  "cost",
  "simplicity",
  "scalability",
];

const ROLES: ArchitectureNodeRole[] = [
  "client",
  "gateway",
  "service",
  "data",
  "process",
  "external",
  "other",
];

/** Labels treated as lazy architecture memes unless rationale is substantive. */
const GENERIC_LABEL_SNIPPETS = [
  "api gateway",
  "microservice",
  "microservices",
  "message queue",
  "event bus",
  "service mesh",
  "load balancer",
  "cache layer",
  "database",
  "postgres",
  "redis",
  "kafka",
  "sqs",
  "cdn only",
];

const ROLE_VISUAL: Record<
  ArchitectureNodeRole,
  { type: string; color: string; icon: string; shape: string }
> = {
  client: { type: "input", color: "#a1bcff", icon: "⇢", shape: "rounded" },
  gateway: { type: "system", color: "#ffd482", icon: "⎆", shape: "rounded" },
  service: { type: "system", color: "#9bd7be", icon: "◧", shape: "rounded" },
  data: { type: "data", color: "#8dd7c2", icon: "🗄", shape: "rounded" },
  process: { type: "process", color: "#c9b8ff", icon: "⚙", shape: "rounded" },
  external: { type: "output", color: "#f3c1ff", icon: "↗", shape: "rounded" },
  other: { type: "note", color: "#b8c4dc", icon: "◫", shape: "rounded" },
};

export const ARCHITECTURE_JSON_SYSTEM_PROMPT = `You are a compiler backend. Output a single JSON object ONLY.
No markdown, no code fences, no commentary before or after the JSON.

Schema (all keys required):
{
  "goal": one of: latency | consistency | cost | simplicity | scalability
  "nodes": [ { "id": string, "label": string, "role": client|gateway|service|data|process|external|other, "rationale": string } ]
  "edges": [ { "from": string, "to": string, "label"?: string } ]
  "decisions": [ { "choice": string, "whatYouGain": string, "whatYouLose": string, "whatBreaksBecauseOfThis": string } ]
  "sacrifices": string[]
  "rejectedAlternatives": [ { "option": string, "reasonRejected": string } ]
}

Rules:
- Minimize boxes. Prefer 3–7 nodes unless the user demands more.
- Every node.rationale must explain why THAT component exists for THIS prompt (≥35 chars).
- Include at least 1 decision with real tradeoffs (not buzzwords only).
- sacrifices: at least 1 explicit capability you refuse to build.
- rejectedAlternatives: at least 1 plausible option you did NOT choose with a concrete reason.
- Do NOT paste a default "API Gateway + microservices + queue + database" stack unless the user explicitly requires those AND each such node rationale quotes the constraint from the user prompt.
- If optimization goal is simplicity, the graph MUST stay small (typically ≤5 nodes) and omit queues, meshes, and multi-service sprawl unless indispensable.`;

export function userPromptForArchitectureAttempt(
  userPrompt: string,
  attemptIndex: number,
  validationErrors: string[]
): string {
  if (attemptIndex === 0) {
    return `User request:\n${userPrompt}\n\nEmit ONLY the JSON object.`;
  }
  return `User request:\n${userPrompt}\n\nPrevious output was REJECTED by the compiler:\n${validationErrors.map((e) => `- ${e}`).join("\n")}\n\nFix ALL issues. Emit ONLY the JSON object.`;
}

/**
 * Strips markdown fences and extracts the outermost JSON object.
 */
export function extractJsonObject(raw: string): unknown {
  let s = raw.trim();
  if (!s) throw new Error("empty model output");
  const fence = /^```(?:json)?\s*([\s\S]*?)```/im.exec(s);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object found");
  s = s.slice(start, end + 1);
  return JSON.parse(s);
}

function isNonEmptyString(x: unknown, min: number): x is string {
  return typeof x === "string" && x.trim().length >= min;
}

export type ValidateResult =
  | { ok: true; spec: ArchitectureSpec }
  | { ok: false; errors: string[] };

export function validateArchitectureSpec(raw: unknown): ValidateResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["root must be a JSON object"] };
  }
  const o = raw as Record<string, unknown>;

  if (!isNonEmptyString(o.goal, 1) || !GOALS.includes(o.goal as PrimaryOptimizationGoal)) {
    errors.push(`goal must be one of: ${GOALS.join(", ")}`);
  }
  const goal = o.goal as PrimaryOptimizationGoal;

  if (!Array.isArray(o.nodes) || o.nodes.length < 2) {
    errors.push("nodes must be an array with at least 2 items");
  }
  if (!Array.isArray(o.edges) || o.edges.length < 1) {
    errors.push("edges must be an array with at least 1 item");
  }
  if (!Array.isArray(o.decisions) || o.decisions.length < 1) {
    errors.push("decisions must be a non-empty array");
  }
  if (!Array.isArray(o.sacrifices) || o.sacrifices.length < 1) {
    errors.push("sacrifices must be a non-empty array (explicit omitted capabilities)");
  }
  if (!Array.isArray(o.rejectedAlternatives) || o.rejectedAlternatives.length < 1) {
    errors.push("rejectedAlternatives must be a non-empty array");
  }

  const nodes: ArchitectureNode[] = [];
  const nodeIds = new Set<string>();

  if (Array.isArray(o.nodes)) {
    for (let i = 0; i < o.nodes.length; i++) {
      const n = o.nodes[i];
      if (!n || typeof n !== "object" || Array.isArray(n)) {
        errors.push(`nodes[${i}] must be an object`);
        continue;
      }
      const rec = n as Record<string, unknown>;
      if (!isNonEmptyString(rec.id, 1)) errors.push(`nodes[${i}].id required`);
      if (!isNonEmptyString(rec.label, 1)) errors.push(`nodes[${i}].label required`);
      if (!isNonEmptyString(rec.rationale, 35))
        errors.push(`nodes[${i}].rationale must be at least 35 characters`);
      if (!isNonEmptyString(rec.role, 1) || !ROLES.includes(rec.role as ArchitectureNodeRole)) {
        errors.push(`nodes[${i}].role must be one of: ${ROLES.join(", ")}`);
      }
      if (isNonEmptyString(rec.id, 1)) {
        if (nodeIds.has(String(rec.id).trim())) errors.push(`duplicate node id: ${rec.id}`);
        else nodeIds.add(String(rec.id).trim());
      }
      if (
        isNonEmptyString(rec.id, 1) &&
        isNonEmptyString(rec.label, 1) &&
        isNonEmptyString(rec.rationale, 35) &&
        isNonEmptyString(rec.role, 1) &&
        ROLES.includes(rec.role as ArchitectureNodeRole)
      ) {
        nodes.push({
          id: String(rec.id).trim(),
          label: String(rec.label).trim(),
          role: rec.role as ArchitectureNodeRole,
          rationale: String(rec.rationale).trim(),
        });
      }
    }
  }

  const edges: ArchitectureEdge[] = [];
  if (Array.isArray(o.edges)) {
    for (let i = 0; i < o.edges.length; i++) {
      const e = o.edges[i];
      if (!e || typeof e !== "object" || Array.isArray(e)) {
        errors.push(`edges[${i}] must be an object`);
        continue;
      }
      const rec = e as Record<string, unknown>;
      if (!isNonEmptyString(rec.from, 1)) errors.push(`edges[${i}].from required`);
      if (!isNonEmptyString(rec.to, 1)) errors.push(`edges[${i}].to required`);
      if (isNonEmptyString(rec.from, 1) && isNonEmptyString(rec.to, 1)) {
        edges.push({
          from: String(rec.from).trim(),
          to: String(rec.to).trim(),
          label: isNonEmptyString(rec.label, 1) ? String(rec.label).trim() : undefined,
        });
      }
    }
  }

  const decisions: ArchitectureDecision[] = [];
  if (Array.isArray(o.decisions)) {
    for (let i = 0; i < o.decisions.length; i++) {
      const d = o.decisions[i];
      if (!d || typeof d !== "object" || Array.isArray(d)) {
        errors.push(`decisions[${i}] must be an object`);
        continue;
      }
      const rec = d as Record<string, unknown>;
      const fields = ["choice", "whatYouGain", "whatYouLose", "whatBreaksBecauseOfThis"] as const;
      for (const f of fields) {
        if (!isNonEmptyString(rec[f], 12)) {
          errors.push(`decisions[${i}].${f} must be a substantive string (≥12 chars)`);
        }
      }
      if (
        isNonEmptyString(rec.choice, 12) &&
        isNonEmptyString(rec.whatYouGain, 12) &&
        isNonEmptyString(rec.whatYouLose, 12) &&
        isNonEmptyString(rec.whatBreaksBecauseOfThis, 12)
      ) {
        decisions.push({
          choice: String(rec.choice).trim(),
          whatYouGain: String(rec.whatYouGain).trim(),
          whatYouLose: String(rec.whatYouLose).trim(),
          whatBreaksBecauseOfThis: String(rec.whatBreaksBecauseOfThis).trim(),
        });
      }
    }
  }

  const sacrifices: string[] = [];
  if (Array.isArray(o.sacrifices)) {
    for (let i = 0; i < o.sacrifices.length; i++) {
      if (!isNonEmptyString(o.sacrifices[i], 8)) {
        errors.push(`sacrifices[${i}] must be a clear string (≥8 chars)`);
      } else sacrifices.push(String(o.sacrifices[i]).trim());
    }
  }

  const rejectedAlternatives: RejectedAlternative[] = [];
  if (Array.isArray(o.rejectedAlternatives)) {
    for (let i = 0; i < o.rejectedAlternatives.length; i++) {
      const r = o.rejectedAlternatives[i];
      if (!r || typeof r !== "object") {
        errors.push(`rejectedAlternatives[${i}] must be an object`);
        continue;
      }
      const rec = r as Record<string, unknown>;
      if (!isNonEmptyString(rec.option, 8)) errors.push(`rejectedAlternatives[${i}].option required`);
      if (!isNonEmptyString(rec.reasonRejected, 12))
        errors.push(`rejectedAlternatives[${i}].reasonRejected required`);
      if (
        isNonEmptyString(rec.option, 8) &&
        isNonEmptyString(rec.reasonRejected, 12)
      ) {
        rejectedAlternatives.push({
          option: String(rec.option).trim(),
          reasonRejected: String(rec.reasonRejected).trim(),
        });
      }
    }
  }

  if (errors.length) return { ok: false, errors };

  for (const e of edges) {
    if (!nodeIds.has(e.from)) errors.push(`edge references unknown from: ${e.from}`);
    if (!nodeIds.has(e.to)) errors.push(`edge references unknown to: ${e.to}`);
  }

  if (errors.length) return { ok: false, errors };

  const spec: ArchitectureSpec = {
    goal,
    nodes,
    edges,
    decisions,
    sacrifices,
    rejectedAlternatives,
  };

  const genericErr = rejectGenericTemplateArchitecture(spec);
  if (genericErr) return { ok: false, errors: [genericErr] };

  return { ok: true, spec };
}

/**
 * Blocks lazy “three-box backend” patterns without reasoning glue.
 */
export function rejectGenericTemplateArchitecture(spec: ArchitectureSpec): string | null {
  const labelBlob = spec.nodes.map((n) => n.label.toLowerCase()).join(" | ");
  const rationaleBlob = spec.nodes.map((n) => n.rationale.toLowerCase()).join(" ");
  const decisionBlob = spec.decisions
    .map((d) => `${d.choice} ${d.whatYouGain} ${d.whatYouLose} ${d.whatBreaksBecauseOfThis}`)
    .join(" ")
    .toLowerCase();
  const glue = `${rationaleBlob} ${decisionBlob}`;

  const hasApiish = /\b(api|gateway|bff|rest|graphql)\b/i.test(labelBlob);
  const hasDataish = /\b(db|database|postgres|mysql|sql|storage|warehouse)\b/i.test(labelBlob);
  const hasQueueish = /\b(queue|kafka|sqs|pub|sub|stream)\b/i.test(labelBlob);

  if (hasApiish && hasDataish && hasQueueish) {
    const causal = /\b(because|therefore|instead|avoid|chose|reject|tradeoff|sacrific|rather|omit)\b/i.test(
      glue
    );
    if (!causal || glue.length < 220) {
      return 'Template rejected: "API-shaped + data store + queue" trio requires long-form causal reasoning across decisions and rationales (not labels alone).';
    }
  }

  for (const n of spec.nodes) {
    const low = n.label.toLowerCase();
    for (const g of GENERIC_LABEL_SNIPPETS) {
      if (low.includes(g)) {
        const r = n.rationale.toLowerCase();
        if (r.length < 45) {
          return `Node "${n.label}" looks generic; rationale must be ≥45 chars with explicit causality.`;
        }
        if (!/\b(because|chose|instead|avoid|reject|tradeoff|omit|rather|only if)\b/.test(r)) {
          return `Node "${n.label}" rationale must state causality (e.g. because / instead of / chose).`;
        }
      }
    }
  }

  if (spec.goal === "simplicity" && spec.nodes.length > 6) {
    return 'goal is "simplicity" but node count > 6 — shrink the architecture or change goal.';
  }

  return null;
}

function slugForId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64) || "n";
}

const LAYOUT_NODE_W = 228;
const LAYOUT_NODE_H = 120;
const LAYOUT_PAD = 72;
const LAYOUT_IDEAL_EDGE = 280;
const LAYOUT_COMPONENT_GAP = 96;

interface Vec2 {
  x: number;
  y: number;
}

function weaklyConnectedComponents(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>
): string[][] {
  const set = new Set(nodeIds);
  const adj = new Map<string, Set<string>>();
  for (const id of nodeIds) adj.set(id, new Set());
  for (const e of edges) {
    if (!set.has(e.from) || !set.has(e.to)) continue;
    adj.get(e.from)!.add(e.to);
    adj.get(e.to)!.add(e.from);
  }
  const seen = new Set<string>();
  const comps: string[][] = [];
  for (const start of [...nodeIds].sort((a, b) => a.localeCompare(b))) {
    if (seen.has(start)) continue;
    const stack = [start];
    seen.add(start);
    const cur: string[] = [];
    while (stack.length) {
      const u = stack.pop()!;
      cur.push(u);
      for (const v of adj.get(u) || []) {
        if (!seen.has(v)) {
          seen.add(v);
          stack.push(v);
        }
      }
    }
    cur.sort((a, b) => a.localeCompare(b));
    comps.push(cur);
  }
  comps.sort((a, b) => b.length - a.length);
  return comps;
}

/** Kahn topological sort; returns null if cycle (within this node set). */
function topologicalOrder(
  ids: string[],
  dirEdges: Array<{ from: string; to: string }>
): string[] | null {
  const set = new Set(ids);
  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    outs.set(id, []);
  }
  for (const e of dirEdges) {
    if (!set.has(e.from) || !set.has(e.to)) continue;
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    outs.get(e.from)!.push(e.to);
  }
  const q = [...ids].filter((id) => (indeg.get(id) || 0) === 0).sort((a, b) => a.localeCompare(b));
  const order: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of outs.get(u) || []) {
      indeg.set(v, (indeg.get(v) || 0) - 1);
      if (indeg.get(v) === 0) q.push(v);
    }
    q.sort((a, b) => a.localeCompare(b));
  }
  if (order.length !== ids.length) return null;
  return order;
}

function isPathGraph(ids: string[], dirEdges: Array<{ from: string; to: string }>): boolean {
  if (ids.length <= 1) return true;
  const set = new Set(ids);
  const indeg = new Map<string, number>();
  const outdeg = new Map<string, number>();
  for (const id of ids) {
    indeg.set(id, 0);
    outdeg.set(id, 0);
  }
  for (const e of dirEdges) {
    if (!set.has(e.from) || !set.has(e.to)) continue;
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    outdeg.set(e.from, (outdeg.get(e.from) || 0) + 1);
  }
  let ends = 0;
  for (const id of ids) {
    const d = (indeg.get(id) || 0) + (outdeg.get(id) || 0);
    if (d === 0) return false;
    if ((indeg.get(id) || 0) <= 1 && (outdeg.get(id) || 0) <= 1) {
      if ((indeg.get(id) || 0) === 0 || (outdeg.get(id) || 0) === 0) ends++;
    } else return false;
  }
  return ends >= 1;
}

/** Shortest-path depth from roots (polar shell seed only; not a placement grid). */
function bfsDepthFromRoots(
  sortedIds: string[],
  subEdges: Array<{ from: string; to: string }>
): { depth: Map<string, number>; byDepth: Map<number, string[]> } {
  const set = new Set(sortedIds);
  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const id of sortedIds) {
    indeg.set(id, 0);
    outs.set(id, []);
  }
  for (const e of subEdges) {
    if (!set.has(e.from) || !set.has(e.to)) continue;
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    outs.get(e.from)!.push(e.to);
  }
  const depth = new Map<string, number>();
  const roots = sortedIds.filter((id) => (indeg.get(id) || 0) === 0).sort((a, b) => a.localeCompare(b));
  const q: string[] = [];
  if (roots.length) {
    for (const r of roots) {
      depth.set(r, 0);
      q.push(r);
    }
  } else if (sortedIds.length) {
    depth.set(sortedIds[0], 0);
    q.push(sortedIds[0]);
  }
  let qi = 0;
  while (qi < q.length) {
    const u = q[qi++];
    const du = depth.get(u)!;
    for (const v of outs.get(u) || []) {
      const nv = du + 1;
      if (!depth.has(v) || nv < depth.get(v)!) {
        depth.set(v, nv);
        q.push(v);
      }
    }
  }
  let fb = 0;
  for (const id of sortedIds) {
    if (!depth.has(id)) depth.set(id, fb++);
  }
  const byDepth = new Map<number, string[]>();
  for (const id of sortedIds) {
    const d = depth.get(id) || 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }
  for (const arr of byDepth.values()) arr.sort((a, b) => a.localeCompare(b));
  return { depth, byDepth };
}

/**
 * Graph-only layout: chain-aware seed + force relaxation.
 * No fixed column/row grids, no longest-path rectangular layering.
 */
export function layoutGraphPositions(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>
): Map<string, Vec2> {
  const set = new Set(nodeIds);
  const subEdges = edges.filter((e) => set.has(e.from) && set.has(e.to));
  const pos = new Map<string, Vec2>();
  if (nodeIds.length === 0) return pos;
  const sortedIds = [...nodeIds].sort((a, b) => a.localeCompare(b));

  if (sortedIds.length === 1) {
    pos.set(sortedIds[0], { x: 0, y: 0 });
    return pos;
  }

  const topo = topologicalOrder(sortedIds, subEdges);
  const density = subEdges.length / Math.max(1, sortedIds.length - 1);
  const chain = isPathGraph(sortedIds, subEdges);

  if (chain && topo) {
    for (const id of sortedIds) {
      const idx = topo.indexOf(id);
      pos.set(id, { x: 0, y: idx * LAYOUT_IDEAL_EDGE * 0.55 });
    }
  } else {
    const { depth, byDepth } = bfsDepthFromRoots(sortedIds, subEdges);
    for (const id of sortedIds) {
      const d = depth.get(id) || 0;
      const layer = byDepth.get(d)!;
      const idx = layer.indexOf(id);
      const m = layer.length;
      const theta = (2 * Math.PI * idx) / Math.max(m, 1) + d * 0.31;
      const r = 88 + d * 168 + Math.min(40, subEdges.length * 6);
      pos.set(id, { x: Math.cos(theta) * r, y: Math.sin(theta) * r });
    }
  }

  const iterations = density > 1.4 || !topo ? 110 : 80;
  let temp = 48;
  const kRep = 8200;
  const kAtt = 0.034;
  const ideal = LAYOUT_IDEAL_EDGE;

  for (let iter = 0; iter < iterations; iter++) {
    const disp = new Map<string, Vec2>();
    for (const id of sortedIds) disp.set(id, { x: 0, y: 0 });

    for (let i = 0; i < sortedIds.length; i++) {
      for (let j = i + 1; j < sortedIds.length; j++) {
        const a = sortedIds[i];
        const b = sortedIds[j];
        const pa = pos.get(a)!;
        const pb = pos.get(b)!;
        let dx = pa.x - pb.x;
        let dy = pa.y - pb.y;
        let dist = Math.hypot(dx, dy) || 0.01;
        const minDist = LAYOUT_NODE_W * 0.95;
        if (dist < minDist) {
          const push = (kRep * (minDist - dist)) / (dist * dist);
          dx *= push;
          dy *= push;
          disp.get(a)!.x += dx;
          disp.get(a)!.y += dy;
          disp.get(b)!.x -= dx;
          disp.get(b)!.y -= dy;
        } else {
          const push = kRep / (dist * dist) * 0.12;
          dx *= push;
          dy *= push;
          disp.get(a)!.x += dx;
          disp.get(a)!.y += dy;
          disp.get(b)!.x -= dx;
          disp.get(b)!.y -= dy;
        }
      }
    }

    for (const e of subEdges) {
      const pa = pos.get(e.from)!;
      const pb = pos.get(e.to)!;
      let dx = pb.x - pa.x;
      let dy = pb.y - pa.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const delta = dist - ideal;
      const f = kAtt * delta;
      dx = (dx / dist) * f;
      dy = (dy / dist) * f;
      disp.get(e.from)!.x += dx;
      disp.get(e.from)!.y += dy;
      disp.get(e.to)!.x -= dx;
      disp.get(e.to)!.y -= dy;
    }

    for (const id of sortedIds) {
      const d = disp.get(id)!;
      const len = Math.hypot(d.x, d.y) || 1;
      const capped = Math.min(len, temp);
      const px = pos.get(id)!;
      px.x += (d.x / len) * capped;
      px.y += (d.y / len) * capped;
    }
    temp *= 0.92;
  }

  let minX = Infinity;
  let minY = Infinity;
  for (const id of sortedIds) {
    const p = pos.get(id)!;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  }
  if (!Number.isFinite(minX)) minX = 0;
  if (!Number.isFinite(minY)) minY = 0;
  for (const id of sortedIds) {
    const p = pos.get(id)!;
    p.x -= minX;
    p.y -= minY;
  }

  return pos;
}

/**
 * Positions every logical node from edge structure only (roles do not affect coordinates).
 */
export function layoutArchitectureGraph(
  logicalNodes: ArchitectureNode[],
  edges: ArchitectureEdge[]
): Map<string, Vec2> {
  const ids = logicalNodes.map((n) => n.id);
  const edgeList = edges.map((e) => ({ from: e.from, to: e.to }));
  const comps = weaklyConnectedComponents(ids, edgeList);
  const out = new Map<string, Vec2>();
  const SINGLE_PLATE_W = 960;
  const SINGLE_PLATE_H = 640;
  let cursorX = LAYOUT_PAD;
  for (const comp of comps) {
    if (comp.length === 1) {
      const id = comp[0];
      out.set(id, {
        x: LAYOUT_PAD + (SINGLE_PLATE_W - LAYOUT_NODE_W) / 2,
        y: LAYOUT_PAD + (SINGLE_PLATE_H - LAYOUT_NODE_H) / 2,
      });
      cursorX += SINGLE_PLATE_W + LAYOUT_COMPONENT_GAP;
      continue;
    }
    const subEdges = edgeList.filter((e) => comp.includes(e.from) && comp.includes(e.to));
    const local = layoutGraphPositions(comp, subEdges);
    let minLX = Infinity;
    let minLY = Infinity;
    let maxLX = -Infinity;
    for (const id of comp) {
      const p = local.get(id)!;
      minLX = Math.min(minLX, p.x);
      minLY = Math.min(minLY, p.y);
      maxLX = Math.max(maxLX, p.x + LAYOUT_NODE_W);
    }
    if (!Number.isFinite(minLX)) minLX = 0;
    if (!Number.isFinite(minLY)) minLY = 0;
    if (!Number.isFinite(maxLX)) maxLX = LAYOUT_NODE_W;
    const width = maxLX - minLX;
    for (const id of comp) {
      const p = local.get(id)!;
      out.set(id, {
        x: cursorX + (p.x - minLX),
        y: LAYOUT_PAD + (p.y - minLY),
      });
    }
    cursorX += width + LAYOUT_COMPONENT_GAP;
  }
  return out;
}

/**
 * Visual mapping from ArchitectureSpec: positions come only from `layoutArchitectureGraph` (edges + connectivity).
 * `batchId` avoids canvas id collisions.
 */
export function renderDiagramFromSpec(
  spec: ArchitectureSpec,
  batchId: string,
  newConnectionIds: () => string
): DiagramPayload {
  const idMap = new Map<string, string>();
  for (const n of spec.nodes) {
    idMap.set(n.id, `arch_${batchId}_${slugForId(n.id)}`);
  }

  const positions = layoutArchitectureGraph(spec.nodes, spec.edges);

  const nodes: CanvasNode[] = spec.nodes.map((n) => {
    const vis = ROLE_VISUAL[n.role];
    const p = positions.get(n.id) ?? { x: LAYOUT_PAD, y: LAYOUT_PAD };
    return {
      id: idMap.get(n.id)!,
      x: p.x,
      y: p.y,
      width: LAYOUT_NODE_W,
      height: LAYOUT_NODE_H,
      text: n.label,
      title: n.label,
      subtitle: `Goal: ${spec.goal} · ${n.role}`,
      description: n.rationale,
      icon: vis.icon,
      type: vis.type,
      color: vis.color,
      shape: vis.shape,
      layoutMode: "graph",
      style: { opacity: 0.92, glow: 14, shadow: 22, radius: 14, borderColor: "#9cb8ff" },
    };
  });

  const connections: CanvasConnection[] = [];
  for (const e of spec.edges) {
    const from = idMap.get(e.from);
    const to = idMap.get(e.to);
    if (!from || !to) continue;
    connections.push({
      id: newConnectionIds(),
      from,
      to,
      kind: "node-node",
    });
  }

  const d0 = spec.decisions[0];
  const title =
    `Architecture · ${spec.goal}` +
    (d0 ? ` — ${d0.choice.slice(0, 56)}${d0.choice.length > 56 ? "…" : ""}` : "");

  return { title, nodes, connections };
}

const DEFAULT_MAX_RETRIES = 2;

export async function compileArchitectureSpecWithRetries(
  userPrompt: string,
  complete: (system: string, user: string) => Promise<string>,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<ArchitectureSpec> {
  let lastErrors: string[] = [];
  const attempts = maxRetries + 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const user = userPromptForArchitectureAttempt(userPrompt, attempt, lastErrors);
    const raw = await complete(ARCHITECTURE_JSON_SYSTEM_PROMPT, user);
    let parsed: unknown;
    try {
      parsed = extractJsonObject(raw);
    } catch (e) {
      lastErrors = [(e as Error).message || "JSON parse failed"];
      continue;
    }
    const v = validateArchitectureSpec(parsed);
    if (v.ok) return v.spec;
    lastErrors = v.errors;
  }
  throw new Error(
    `Architecture compiler exhausted ${attempts} attempt(s). Last errors:\n${lastErrors.join("\n")}`
  );
}
