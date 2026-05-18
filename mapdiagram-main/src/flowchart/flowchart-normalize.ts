/**
 * Clean AI-emitted FlowchartSpec before validation/layout.
 */
import type {
  FlowchartLogicEdge,
  FlowchartLogicNode,
  FlowchartNodeKind,
  FlowchartSpec,
} from "./flowchart-spec";
import { FLOWCHART_LIMITS } from "./flowchart-spec";

const YES_LABELS = new Set(["yes", "y", "true", "approved", "approve", "pass", "ok"]);
const NO_LABELS = new Set(["no", "n", "false", "rejected", "reject", "deny", "fail", "decline"]);

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 && /^[a-z]+$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

function shortenLabel(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ");
  const stop = new Set([
    "the", "a", "an", "to", "for", "of", "and", "with", "that", "this", "user", "customer",
    "submitted", "request", "process", "step", "workflow", "manager", "employee", "team",
  ]);
  const words = s.split(/\s+/).filter((w) => !stop.has(w.toLowerCase()));
  if (words.length >= 2 && words.length <= 5 && s.length > 36) {
    s = words.slice(0, 4).join(" ");
  } else if (s.length > 48) {
    s = (words.length ? words : s.split(/\s+/)).slice(0, 4).join(" ");
  }
  if (s.length > 40) s = s.slice(0, 38).trim() + "…";
  return s.length > FLOWCHART_LIMITS.maxLabelLength
    ? s.slice(0, FLOWCHART_LIMITS.maxLabelLength - 1).trim() + "…"
    : s;
}

function normalizeBranchLabel(label: string | undefined): string | undefined {
  if (!label) return undefined;
  const k = label.trim().toLowerCase();
  if (YES_LABELS.has(k)) return "Yes";
  if (NO_LABELS.has(k)) return "No";
  return titleCaseWords(label.trim()).slice(0, 40);
}

function inferKind(label: string, kind: unknown): FlowchartNodeKind {
  if (kind === "start" || kind === "process" || kind === "decision" || kind === "end") return kind;
  const l = label.toLowerCase();
  if (/\b(start|begin)\b/.test(l)) return "start";
  if (/\b(end|complete|finish|done|closed)\b/.test(l)) return "end";
  if (/\?$/.test(label.trim()) || /\b(if|whether)\b/.test(l)) return "decision";
  return "process";
}

function forwardRanks(nodes: FlowchartLogicNode[], edges: FlowchartLogicEdge[]): Map<string, number> {
  const start = nodes.find((n) => n.kind === "start")?.id;
  const rank = new Map<string, number>();
  if (!start) return rank;
  const fwd = edges.filter((e) => !e.meta?.isBackEdge);
  const children = new Map<string, string[]>();
  for (const n of nodes) children.set(n.id, []);
  for (const e of fwd) children.get(e.from)?.push(e.to);
  const q = [{ id: start, d: 0 }];
  while (q.length) {
    const { id, d } = q.shift()!;
    if (rank.has(id) && rank.get(id)! <= d) continue;
    rank.set(id, d);
    for (const ch of children.get(id) || []) q.push({ id: ch, d: d + 1 });
  }
  return rank;
}

function dedupeLabels(nodes: FlowchartLogicNode[]): void {
  const seen = new Map<string, number>();
  for (const n of nodes) {
    const key = n.label.toLowerCase();
    const c = (seen.get(key) || 0) + 1;
    seen.set(key, c);
    if (c > 1 && n.kind !== "start" && n.kind !== "end") {
      n.label = `${n.label} (${c})`;
    }
  }
}

function removeOrphanNodes(nodes: FlowchartLogicNode[], edges: FlowchartLogicEdge[]): FlowchartLogicNode[] {
  const touched = new Set<string>();
  for (const e of edges) {
    touched.add(e.from);
    touched.add(e.to);
  }
  const start = nodes.find((n) => n.kind === "start");
  if (start) touched.add(start.id);
  return nodes.filter((n) => touched.has(n.id));
}

function dedupeTrivialChains(nodes: FlowchartLogicNode[], edges: FlowchartLogicEdge[]): FlowchartLogicEdge[] {
  const out = new Map<string, FlowchartLogicEdge[]>();
  const inc = new Map<string, number>();
  for (const n of nodes) {
    out.set(n.id, []);
    inc.set(n.id, 0);
  }
  for (const e of edges) {
    out.get(e.from)?.push(e);
    inc.set(e.to, (inc.get(e.to) || 0) + 1);
  }
  const skip = new Set<string>();
  for (const n of nodes) {
    if (n.kind !== "process") continue;
    const outs = out.get(n.id) || [];
    const ins = inc.get(n.id) || 0;
    if (ins === 1 && outs.length === 1 && !outs[0].label) {
      const next = nodes.find((x) => x.id === outs[0].to);
      if (next && next.kind === "process" && next.label.toLowerCase() === n.label.toLowerCase()) {
        skip.add(n.id);
      }
    }
  }
  if (!skip.size) return edges;
  const remap = new Map<string, string>();
  for (const id of skip) {
    const o = out.get(id)?.[0];
    if (o) remap.set(id, o.to);
  }
  const resolve = (id: string): string => {
    let cur = id;
    let guard = 0;
    while (remap.has(cur) && guard++ < 8) cur = remap.get(cur)!;
    return cur;
  };
  const next: FlowchartLogicEdge[] = [];
  for (const e of edges) {
    if (skip.has(e.from) || skip.has(e.to)) continue;
    const from = resolve(e.from);
    const to = resolve(e.to);
    if (from === to) continue;
    next.push({ ...e, from, to });
  }
  return next;
}

function autoMarkBackEdges(nodes: FlowchartLogicNode[], edges: FlowchartLogicEdge[]): void {
  const ranks = forwardRanks(nodes, edges);
  let marked = edges.filter((e) => e.meta?.isBackEdge).length;
  for (const e of edges) {
    if (e.meta?.isBackEdge) continue;
    const rf = ranks.get(e.from);
    const rt = ranks.get(e.to);
    if (rf == null || rt == null) continue;
    if (rf > rt + 0 && marked < 2) {
      e.meta = { ...(e.meta || {}), isBackEdge: true };
      marked++;
    }
  }
}

function ensureEndNode(nodes: FlowchartLogicNode[], edges: FlowchartLogicEdge[]): void {
  if (nodes.some((n) => n.kind === "end")) return;
  const leaves = nodes.filter((n) => !edges.some((e) => e.from === n.id));
  if (leaves.length === 1 && leaves[0].kind === "process") {
    leaves[0].kind = "end";
    if (!/\b(end|complete|finish|done)\b/i.test(leaves[0].label)) {
      leaves[0].label = "Complete";
    }
  }
}

/** Best-effort draft from loose JSON (pre-validation). */
export function coerceDraftSpec(raw: unknown): FlowchartSpec {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const nodes: FlowchartLogicNode[] = [];
  if (Array.isArray(o.nodes)) {
    for (const n of o.nodes) {
      if (!n || typeof n !== "object") continue;
      const rec = n as Record<string, unknown>;
      const id = typeof rec.id === "string" ? rec.id.trim() : "";
      const label = typeof rec.label === "string" ? rec.label.trim() : id || "Step";
      if (!id) continue;
      nodes.push({
        id,
        label,
        kind: inferKind(label, rec.kind),
      });
    }
  }
  const edges: FlowchartLogicEdge[] = [];
  if (Array.isArray(o.edges)) {
    for (const e of o.edges) {
      if (!e || typeof e !== "object") continue;
      const rec = e as Record<string, unknown>;
      const from = typeof rec.from === "string" ? rec.from.trim() : "";
      const to = typeof rec.to === "string" ? rec.to.trim() : "";
      if (!from || !to) continue;
      const edge: FlowchartLogicEdge = { from, to };
      if (typeof rec.label === "string" && rec.label.trim()) edge.label = rec.label.trim();
      const meta = rec.meta;
      if (meta && typeof meta === "object" && (meta as Record<string, unknown>).isBackEdge === true) {
        edge.meta = { isBackEdge: true };
      }
      edges.push(edge);
    }
  }
  return {
    version: 1,
    title: typeof o.title === "string" ? o.title.trim() : "Process",
    direction: o.direction === "LR" ? "LR" : "TB",
    nodes,
    edges,
  };
}

/**
 * Deterministic normalization pass for AI output.
 */
export function normalizeFlowchartSpec(raw: FlowchartSpec): FlowchartSpec {
  const nodes: FlowchartLogicNode[] = raw.nodes.map((n) => ({
    id: n.id.trim(),
    label: shortenLabel(titleCaseWords(n.label.trim())),
    kind: inferKind(n.label, n.kind),
    ...(n.note ? { note: n.note.trim().slice(0, 120) } : {}),
  }));

  let edges: FlowchartLogicEdge[] = raw.edges.map((e) => {
    const edge: FlowchartLogicEdge = { from: e.from.trim(), to: e.to.trim() };
    const lab = normalizeBranchLabel(e.label);
    if (lab) edge.label = lab;
    if (e.meta?.isBackEdge) edge.meta = { isBackEdge: true };
    return edge;
  });

  edges = dedupeTrivialChains(nodes, edges);
  autoMarkBackEdges(nodes, edges);

  const filteredNodes = removeOrphanNodes(nodes, edges);
  dedupeLabels(filteredNodes);
  ensureEndNode(filteredNodes, edges);

  return {
    version: 1,
    title: raw.title.trim().slice(0, 120) || "Process",
    direction: raw.direction === "LR" ? "LR" : "TB",
    nodes: filteredNodes,
    edges,
  };
}
