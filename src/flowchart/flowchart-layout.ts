/**
 * Dagre layout — geometry from graph structure only.
 */
import dagre from "dagre";
import type { FlowchartSpec, FlowchartNodeKind } from "./flowchart-spec";
import { forwardEdges } from "./flowchart-spec";
import { measureFlowchartLabel } from "./flowchart-label";

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BASE_DIMS: Record<FlowchartNodeKind, { width: number; height: number }> = {
  start: { width: 170, height: 64 },
  process: { width: 190, height: 88 },
  decision: { width: 220, height: 140 },
  end: { width: 170, height: 64 },
};

export function nodeDimensions(
  kind: FlowchartNodeKind,
  label?: string,
): { width: number; height: number } {
  if (!label) return { ...BASE_DIMS[kind] };
  const m = measureFlowchartLabel(label, kind);
  return { width: m.width, height: m.height };
}

/**
 * Layout nodes with dagre (forward edges only). Returns top-left positions in diagram space.
 */
export function layoutFlowchart(spec: FlowchartSpec): Map<string, LayoutRect> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: spec.direction === "LR" ? "LR" : "TB",
    ranksep: 96,
    nodesep: 58,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const dims = new Map<string, { width: number; height: number }>();
  for (const n of spec.nodes) {
    const d = nodeDimensions(n.kind, n.label);
    dims.set(n.id, d);
    g.setNode(n.id, { width: d.width, height: d.height });
  }
  for (const e of forwardEdges(spec.edges)) {
    g.setEdge(e.from, e.to);
  }

  dagre.layout(g);

  const out = new Map<string, LayoutRect>();
  for (const n of spec.nodes) {
    const d = g.node(n.id);
    const dim = dims.get(n.id)!;
    out.set(n.id, {
      x: d.x - dim.width / 2,
      y: d.y - dim.height / 2,
      width: dim.width,
      height: dim.height,
    });
  }
  return out;
}
