/**
 * Export canvas diagram → FlowchartSpec (logic only, no geometry).
 */
import type { FlowchartSpec, FlowchartLogicEdge, FlowchartLogicNode, FlowchartNodeKind } from "./flowchart-spec";
import type { CanvasConnection, CanvasNode } from "./flowchart-compile";

const KIND_FROM_TYPE: Record<string, FlowchartNodeKind> = {
  input: "start",
  process: "process",
  decision: "decision",
  output: "end",
};

function inferKindFromNode(n: CanvasNode): FlowchartNodeKind {
  const t = String(n.type || "").toLowerCase();
  if (KIND_FROM_TYPE[t]) return KIND_FROM_TYPE[t];
  const title = String(n.title || n.text || "").toLowerCase();
  if (/\b(start|begin)\b/.test(title)) return "start";
  if (/\b(end|complete|finish|done)\b/.test(title)) return "end";
  if (n.shape === "diamond" || t === "decision") return "decision";
  return "process";
}

function slugId(prefix: string, used: Set<string>): string {
  let base = prefix.replace(/[^a-zA-Z0-9_]+/g, "_").toLowerCase().replace(/^_+|_+$/g, "") || "node";
  if (!/^[a-z]/.test(base)) base = `n_${base}`;
  let id = base.slice(0, 40);
  let i = 2;
  while (used.has(id)) {
    id = `${base.slice(0, 36)}_${i++}`;
  }
  used.add(id);
  return id;
}

export interface ExportCanvasInput {
  title?: string;
  direction?: "TB" | "LR";
  nodes: CanvasNode[];
  connections: CanvasConnection[];
}

/**
 * Reverse-compile visible canvas state into a FlowchartSpec for future refine operations.
 */
export function exportCanvasToFlowchartSpec(input: ExportCanvasInput): FlowchartSpec {
  const used = new Set<string>();
  const canvasToLogic = new Map<string, string>();

  const nodes: FlowchartLogicNode[] = input.nodes.map((n) => {
    const label = String(n.title || n.text || "Step")
      .replace(/\n/g, " ")
      .trim()
      .slice(0, 80);
    const kind = inferKindFromNode(n);
    const id = slugId(label || kind, used);
    canvasToLogic.set(n.id, id);
    return { id, label: label || kind, kind };
  });

  const edges: FlowchartLogicEdge[] = [];
  for (const c of input.connections) {
    if (!c.from || !c.to) continue;
    const from = canvasToLogic.get(c.from);
    const to = canvasToLogic.get(c.to);
    if (!from || !to || from === to) continue;
    const edge: FlowchartLogicEdge = { from, to };
    if (c.label && String(c.label).trim()) edge.label = String(c.label).trim().slice(0, 40);
    if (c.meta?.isBackEdge) edge.meta = { isBackEdge: true };
    edges.push(edge);
  }

  return {
    version: 1,
    title: (input.title || "Exported flowchart").trim().slice(0, 120),
    direction: input.direction === "LR" ? "LR" : "TB",
    nodes,
    edges,
  };
}
