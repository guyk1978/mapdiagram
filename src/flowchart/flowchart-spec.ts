/**
 * Flowchart logic spec — NO geometry, styles, or canvas fields.
 */

export type FlowchartDirection = "TB" | "LR";
export type FlowchartNodeKind = "start" | "process" | "decision" | "end";

export interface FlowchartEdgeMeta {
  isBackEdge?: boolean;
}

export interface FlowchartSpec {
  version: 1;
  title: string;
  direction: FlowchartDirection;
  nodes: FlowchartLogicNode[];
  edges: FlowchartLogicEdge[];
}

export interface FlowchartLogicNode {
  id: string;
  label: string;
  kind: FlowchartNodeKind;
  note?: string;
}

export interface FlowchartLogicEdge {
  from: string;
  to: string;
  label?: string;
  meta?: FlowchartEdgeMeta;
}

export const FLOWCHART_LIMITS = {
  maxNodes: 25,
  maxEdges: 30,
  maxLabelLength: 80,
  maxBackEdges: 2,
} as const;

const KINDS: FlowchartNodeKind[] = ["start", "process", "decision", "end"];

function isNonEmptyString(x: unknown, min = 1): x is string {
  return typeof x === "string" && x.trim().length >= min;
}

export type ValidateFlowchartResult =
  | { ok: true; spec: FlowchartSpec }
  | { ok: false; errors: string[] };

export function isForwardEdge(e: FlowchartLogicEdge): boolean {
  return !e.meta?.isBackEdge;
}

export function forwardEdges(edges: FlowchartLogicEdge[]): FlowchartLogicEdge[] {
  return edges.filter(isForwardEdge);
}

export function backEdges(edges: FlowchartLogicEdge[]): FlowchartLogicEdge[] {
  return edges.filter((e) => e.meta?.isBackEdge);
}

function hasCycle(nodeIds: string[], edges: FlowchartLogicEdge[]): boolean {
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of nodeIds) {
    adj.set(id, []);
    indeg.set(id, 0);
  }
  for (const e of edges) {
    adj.get(e.from)?.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }
  const q: string[] = [];
  for (const id of nodeIds) {
    if ((indeg.get(id) || 0) === 0) q.push(id);
  }
  let seen = 0;
  while (q.length) {
    const id = q.shift()!;
    seen++;
    for (const to of adj.get(id) || []) {
      const d = (indeg.get(to) || 0) - 1;
      indeg.set(to, d);
      if (d === 0) q.push(to);
    }
  }
  return seen !== nodeIds.length;
}

/** Forward ranks from start (BFS on non-back edges). */
export function computeForwardRanks(
  nodeIds: string[],
  edges: FlowchartLogicEdge[],
  startId: string,
): Map<string, number> {
  const fwd = forwardEdges(edges);
  const children = new Map<string, string[]>();
  for (const id of nodeIds) children.set(id, []);
  for (const e of fwd) children.get(e.from)?.push(e.to);
  const rank = new Map<string, number>();
  const q = [{ id: startId, d: 0 }];
  while (q.length) {
    const { id, d } = q.shift()!;
    if (rank.has(id) && rank.get(id)! <= d) continue;
    rank.set(id, d);
    for (const ch of children.get(id) || []) q.push({ id: ch, d: d + 1 });
  }
  return rank;
}

function findStronglyConnected(
  nodeIds: string[],
  edges: FlowchartLogicEdge[],
): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const sccs: string[][] = [];
  let i = 0;

  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) adj.get(e.from)?.push(e.to);

  function strongConnect(v: string) {
    index.set(v, i);
    low.set(v, i);
    i++;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v) || []) {
      if (!index.has(w)) {
        strongConnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      sccs.push(comp);
    }
  }

  for (const id of nodeIds) {
    if (!index.has(id)) strongConnect(id);
  }
  return sccs;
}

function validateControlledLoops(
  nodeIds: string[],
  edges: FlowchartLogicEdge[],
  startId: string,
  errors: string[],
): void {
  const backs = backEdges(edges);
  if (backs.length > FLOWCHART_LIMITS.maxBackEdges) {
    errors.push(`at most ${FLOWCHART_LIMITS.maxBackEdges} back-edges allowed (meta.isBackEdge)`);
  }

  const fwd = forwardEdges(edges);
  if (fwd.length && hasCycle(nodeIds, fwd)) {
    errors.push("forward flow must be acyclic (back-edges use meta.isBackEdge)");
  }

  const ranks = computeForwardRanks(nodeIds, edges, startId);
  for (const e of backs) {
    const rf = ranks.get(e.from);
    const rt = ranks.get(e.to);
    if (rf == null || rt == null) {
      errors.push(`back-edge ${e.from}→${e.to}: nodes must be reachable from start via forward edges`);
      continue;
    }
    if (rf <= rt) {
      errors.push(`back-edge ${e.from}→${e.to}: must target an ancestor (lower forward rank)`);
    }
  }

  const sccs = findStronglyConnected(nodeIds, edges).filter((c) => c.length > 1);
  for (const comp of sccs) {
    const internal = edges.filter((e) => comp.includes(e.from) && comp.includes(e.to));
    const backIn = internal.filter((e) => e.meta?.isBackEdge).length;
    if (comp.length > 3 || (comp.length > 2 && backIn > 1)) {
      errors.push("complex cyclic cluster not allowed; use at most 2 controlled back-edges");
      break;
    }
    if (backIn === 0) {
      errors.push("cycle detected without controlled back-edges");
      break;
    }
  }
}

/**
 * Strict validation for AI-emitted FlowchartSpec JSON.
 */
export function validateFlowchartSpec(raw: unknown): ValidateFlowchartResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["root must be a JSON object"] };
  }
  const o = raw as Record<string, unknown>;

  if (o.version !== 1) errors.push("version must be 1");
  if (!isNonEmptyString(o.title, 1)) errors.push("title is required");
  const direction = o.direction === "LR" ? "LR" : o.direction === "TB" ? "TB" : null;
  if (!direction) errors.push('direction must be "TB" or "LR"');

  if (!Array.isArray(o.nodes)) errors.push("nodes must be an array");
  if (!Array.isArray(o.edges)) errors.push("edges must be an array");

  const nodes: FlowchartLogicNode[] = [];
  const nodeIds = new Set<string>();

  if (Array.isArray(o.nodes)) {
    if (o.nodes.length > FLOWCHART_LIMITS.maxNodes) {
      errors.push(`nodes: max ${FLOWCHART_LIMITS.maxNodes} allowed`);
    }
    for (let i = 0; i < o.nodes.length; i++) {
      const n = o.nodes[i];
      if (!n || typeof n !== "object" || Array.isArray(n)) {
        errors.push(`nodes[${i}] must be an object`);
        continue;
      }
      const rec = n as Record<string, unknown>;
      const id = isNonEmptyString(rec.id) ? rec.id.trim() : "";
      const labelRaw = typeof rec.label === "string" ? rec.label.trim() : "";
      const kind = rec.kind;
      if (!id) errors.push(`nodes[${i}].id is required`);
      if (!labelRaw) errors.push(`nodes[${i}].label must not be empty`);
      else if (labelRaw.length > FLOWCHART_LIMITS.maxLabelLength) {
        errors.push(`nodes[${i}].label max ${FLOWCHART_LIMITS.maxLabelLength} characters`);
      }
      if (!KINDS.includes(kind as FlowchartNodeKind)) {
        errors.push(`nodes[${i}].kind must be start|process|decision|end`);
      }
      if (id) {
        if (nodeIds.has(id)) errors.push(`duplicate node id: ${id}`);
        else nodeIds.add(id);
      }
      if (id && labelRaw && KINDS.includes(kind as FlowchartNodeKind)) {
        const node: FlowchartLogicNode = {
          id,
          label: labelRaw,
          kind: kind as FlowchartNodeKind,
        };
        if (isNonEmptyString(rec.note)) node.note = String(rec.note).trim().slice(0, 120);
        nodes.push(node);
      }
    }
  }

  const edges: FlowchartLogicEdge[] = [];
  if (Array.isArray(o.edges)) {
    if (o.edges.length > FLOWCHART_LIMITS.maxEdges) {
      errors.push(`edges: max ${FLOWCHART_LIMITS.maxEdges} allowed`);
    }
    for (let i = 0; i < o.edges.length; i++) {
      const e = o.edges[i];
      if (!e || typeof e !== "object" || Array.isArray(e)) {
        errors.push(`edges[${i}] must be an object`);
        continue;
      }
      const rec = e as Record<string, unknown>;
      const from = isNonEmptyString(rec.from) ? rec.from.trim() : "";
      const to = isNonEmptyString(rec.to) ? rec.to.trim() : "";
      if (!from) errors.push(`edges[${i}].from is required`);
      if (!to) errors.push(`edges[${i}].to is required`);
      if (from && to) {
        const edge: FlowchartLogicEdge = { from, to };
        if (isNonEmptyString(rec.label)) {
          edge.label = String(rec.label).trim().slice(0, 40);
        }
        const meta = rec.meta;
        if (meta && typeof meta === "object" && !Array.isArray(meta)) {
          const m = meta as Record<string, unknown>;
          if (m.isBackEdge === true) edge.meta = { isBackEdge: true };
        }
        edges.push(edge);
      }
    }
  }

  const starts = nodes.filter((n) => n.kind === "start");
  const ends = nodes.filter((n) => n.kind === "end");
  if (starts.length !== 1) errors.push("exactly one start node is required");
  if (ends.length < 1) errors.push("at least one end node is required");

  for (const e of edges) {
    if (!nodeIds.has(e.from)) errors.push(`edge ${e.from}→${e.to}: unknown from node`);
    if (!nodeIds.has(e.to)) errors.push(`edge ${e.from}→${e.to}: unknown to node`);
    if (e.from === e.to) errors.push(`edge ${e.from}→${e.to}: self-loop not allowed`);
  }

  const outCount = new Map<string, number>();
  const outFwd = new Map<string, number>();
  for (const e of edges) {
    outCount.set(e.from, (outCount.get(e.from) || 0) + 1);
    if (isForwardEdge(e)) outFwd.set(e.from, (outFwd.get(e.from) || 0) + 1);
  }
  for (const n of nodes) {
    if (n.kind === "decision") {
      const fwdOut = outFwd.get(n.id) || 0;
      const totalOut = outCount.get(n.id) || 0;
      if (fwdOut < 2 && totalOut < 2) {
        errors.push(`decision node "${n.id}" must have at least 2 outgoing edges`);
      }
    }
  }

  const ids = [...nodeIds];
  if (ids.length && edges.length && starts[0]) {
    validateControlledLoops(ids, edges, starts[0].id, errors);
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    spec: {
      version: 1,
      title: String(o.title).trim(),
      direction: direction!,
      nodes,
      edges,
    },
  };
}

export function extractJsonObject(raw: string): unknown {
  let s = raw.trim();
  if (!s) throw new Error("empty model output");
  const fence = /^```(?:json)?\s*([\s\S]*?)```/im.exec(s);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(s.slice(start, end + 1));
}
