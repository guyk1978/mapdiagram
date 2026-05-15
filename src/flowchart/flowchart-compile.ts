/**
 * Compile FlowchartSpec → existing MapDiagram canvas payload.
 */
import type { FlowchartSpec, FlowchartLogicEdge } from "./flowchart-spec";
import { forwardEdges, isForwardEdge } from "./flowchart-spec";
import { layoutFlowchart } from "./flowchart-layout";
import { beautifyFlowchartLayout } from "./flowchart-beautify";
import type { LayoutRect } from "./flowchart-layout";
import { measureFlowchartLabel } from "./flowchart-label";

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
  style: {
    opacity: number;
    glow: number;
    shadow: number;
    radius: number;
    borderColor: string;
  };
}

export interface CanvasConnectionMeta {
  isBackEdge?: boolean;
  branchHint?: "yes" | "no" | "primary" | "secondary";
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
  labelOffset?: { dx: number; dy: number };
  strokeDash?: "solid" | "dashed" | "dotted";
  strokeWidth?: number;
  strokeColor?: string | null;
  meta?: CanvasConnectionMeta;
}

export interface DiagramPayload {
  title: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  /** Logical id → canvas id */
  idMap: Map<string, string>;
  /** Topological reveal order (logical ids) */
  revealOrder: string[];
}

const VISUAL = {
  start: { type: "input", shape: "circle", color: "#7fd9a8", icon: "▶", radius: 12, opacity: 0.88, glow: 8, shadow: 12 },
  process: { type: "process", shape: "rounded", color: "#8fb2ff", icon: "⚙", radius: 14, opacity: 0.94, glow: 14, shadow: 18 },
  decision: { type: "decision", shape: "diamond", color: "#ffd482", icon: "◆", radius: 14, opacity: 0.96, glow: 16, shadow: 20 },
  end: { type: "output", shape: "circle", color: "#a8b4d4", icon: "■", radius: 12, opacity: 0.88, glow: 8, shadow: 12 },
} as const;

function slugForId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
}

function branchHintForEdge(
  spec: FlowchartSpec,
  e: FlowchartLogicEdge,
): CanvasConnectionMeta["branchHint"] | undefined {
  if (e.meta?.isBackEdge) return "secondary";
  const fromNode = spec.nodes.find((n) => n.id === e.from);
  if (fromNode?.kind !== "decision" || !e.label) return e.meta?.isBackEdge ? "secondary" : "primary";
  const lab = e.label.toLowerCase();
  if (lab === "yes" || lab === "y") return "yes";
  if (lab === "no" || lab === "n") return "no";
  return "primary";
}

function labelOffsetForEdge(
  spec: FlowchartSpec,
  e: FlowchartLogicEdge,
): { dx: number; dy: number } | undefined {
  const hint = branchHintForEdge(spec, e);
  if (spec.direction === "LR") {
    if (hint === "yes") return { dx: 8, dy: -10 };
    if (hint === "no") return { dx: -8, dy: -10 };
    if (hint === "secondary") return { dx: -24, dy: -6 };
    return e.label ? { dx: 0, dy: -8 } : undefined;
  }
  if (hint === "yes") return { dx: 22, dy: -6 };
  if (hint === "no") return { dx: -22, dy: -6 };
  if (hint === "secondary") return { dx: -32, dy: 8 };
  return e.label ? { dx: 0, dy: -6 } : undefined;
}

function topologicalOrder(spec: FlowchartSpec): string[] {
  const ids = spec.nodes.map((n) => n.id);
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    adj.set(id, []);
  }
  for (const e of forwardEdges(spec.edges)) {
    adj.get(e.from)?.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }
  const q = ids.filter((id) => (indeg.get(id) || 0) === 0).sort();
  const order: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    for (const to of adj.get(id) || []) {
      const d = (indeg.get(to) || 0) - 1;
      indeg.set(to, d);
      if (d === 0) q.push(to);
    }
    q.sort();
  }
  for (const id of ids) if (!order.includes(id)) order.push(id);
  return order;
}

export function compileFlowchartToCanvas(
  spec: FlowchartSpec,
  batchId: string,
  newId: () => string,
): DiagramPayload {
  const raw = layoutFlowchart(spec);
  const layout = beautifyFlowchartLayout(spec, raw);

  const idMap = new Map<string, string>();
  for (const n of spec.nodes) {
    idMap.set(n.id, `fc_${batchId}_${slugForId(n.id)}`);
  }

  const nodes: CanvasNode[] = spec.nodes.map((n) => {
    const vis = VISUAL[n.kind];
    const measured = measureFlowchartLabel(n.label, n.kind);
    const pos: LayoutRect = layout.get(n.id) ?? { x: 64, y: 64, width: measured.width, height: measured.height };
    return {
      id: idMap.get(n.id)!,
      x: pos.x,
      y: pos.y,
      width: Math.max(pos.width, measured.width),
      height: Math.max(pos.height, measured.height),
      text: measured.lines.join("\n"),
      title: n.label,
      subtitle:
        n.kind === "decision" ? "Branch" : n.kind === "start" ? "Begin" : n.kind === "end" ? "Finish" : "Step",
      description: n.note || "",
      icon: vis.icon,
      type: vis.type,
      color: vis.color,
      shape: vis.shape,
      style: {
        opacity: vis.opacity,
        glow: vis.glow,
        shadow: vis.shadow,
        radius: vis.radius,
        borderColor: n.kind === "decision" ? "#e8c878" : "#9cb8ff",
      },
    };
  });

  const connections: CanvasConnection[] = spec.edges.map((e) => {
    const isBack = !!e.meta?.isBackEdge;
    const hint = branchHintForEdge(spec, e);
    const conn: CanvasConnection = {
      id: newId(),
      from: idMap.get(e.from)!,
      to: idMap.get(e.to)!,
      label: e.label || "",
      meta: { isBackEdge: isBack, branchHint: hint },
    };
    const off = labelOffsetForEdge(spec, e);
    if (off) conn.labelOffset = off;
    if (isBack) {
      conn.strokeDash = "dashed";
      conn.strokeWidth = 1.85;
      conn.strokeColor = "#8fa3c8";
    } else if (hint === "secondary") {
      conn.strokeDash = "dotted";
    }
    return conn;
  });

  return {
    title: spec.title,
    nodes,
    connections,
    idMap,
    revealOrder: topologicalOrder(spec),
  };
}

/** @internal for tests */
export { branchHintForEdge, labelOffsetForEdge, isForwardEdge };
