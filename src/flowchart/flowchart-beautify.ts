/**

 * Deterministic post-dagre polish — no physics, no randomness.

 */

import type { FlowchartSpec } from "./flowchart-spec";

import { backEdges, forwardEdges } from "./flowchart-spec";

import type { LayoutRect } from "./flowchart-layout";



const GRID = 8;



function snap(v: number): number {

  return Math.round(v / GRID) * GRID;

}



function centerX(r: LayoutRect): number {

  return r.x + r.width / 2;

}



function centerY(r: LayoutRect): number {

  return r.y + r.height / 2;

}



function cloneMap(m: Map<string, LayoutRect>): Map<string, LayoutRect> {

  const out = new Map<string, LayoutRect>();

  for (const [k, v] of m) out.set(k, { ...v });

  return out;

}



function buildGraph(spec: FlowchartSpec) {

  const children = new Map<string, string[]>();

  const parents = new Map<string, string[]>();

  for (const n of spec.nodes) {

    children.set(n.id, []);

    parents.set(n.id, []);

  }

  for (const e of forwardEdges(spec.edges)) {

    children.get(e.from)?.push(e.to);

    parents.get(e.to)?.push(e.from);

  }

  return { children, parents };

}



function bfsDepth(spec: FlowchartSpec): Map<string, number> {

  const { children } = buildGraph(spec);

  const start = spec.nodes.find((n) => n.kind === "start")?.id;

  const depth = new Map<string, number>();

  if (!start) return depth;

  const q = [{ id: start, d: 0 }];

  while (q.length) {

    const { id, d } = q.shift()!;

    if (depth.has(id) && depth.get(id)! <= d) continue;

    depth.set(id, d);

    for (const ch of children.get(id) || []) q.push({ id: ch, d: d + 1 });

  }

  for (const n of spec.nodes) if (!depth.has(n.id)) depth.set(n.id, 0);

  return depth;

}



function reorderSiblingLayers(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  const { parents } = buildGraph(spec);

  const depth = bfsDepth(spec);

  const byDepth = new Map<number, string[]>();

  for (const n of spec.nodes) {

    const d = depth.get(n.id) || 0;

    if (!byDepth.has(d)) byDepth.set(d, []);

    byDepth.get(d)!.push(n.id);

  }

  const vertical = spec.direction === "TB";

  for (const [, ids] of byDepth) {

    if (ids.length < 2) continue;

    ids.sort((a, b) => {

      const pa = parents.get(a) || [];

      const pb = parents.get(b) || [];

      const ma =

        pa.length && layout.has(pa[0]) ? centerX(layout.get(pa[0])!) : centerX(layout.get(a)!);

      const mb =

        pb.length && layout.has(pb[0]) ? centerX(layout.get(pb[0])!) : centerX(layout.get(b)!);

      return ma - mb;

    });

    const gap = vertical ? 212 : 98;

    const first = layout.get(ids[0])!;

    const span = (ids.length - 1) * gap;

    const axisStart = vertical

      ? centerX(first) - span / 2

      : centerY(first) - span / 2;

    ids.forEach((id, i) => {

      const r = layout.get(id);

      if (!r) return;

      if (vertical) r.x = axisStart + i * gap - r.width / 2;

      else r.y = axisStart + i * gap - r.height / 2;

    });

  }

}



function balanceSubtrees(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  const { children } = buildGraph(spec);

  const vertical = spec.direction === "TB";

  for (const n of spec.nodes) {

    const ch = children.get(n.id) || [];

    if (ch.length < 2 || !layout.has(n.id)) continue;

    const pr = layout.get(n.id)!;

    const pc = vertical ? centerX(pr) : centerY(pr);

    const gap = vertical ? 212 : 98;

    ch.sort((a, b) => centerX(layout.get(a)!) - centerX(layout.get(b)!));

    let axis = pc - ((ch.length - 1) * gap) / 2;

    for (const cid of ch) {

      const cr = layout.get(cid);

      if (!cr) continue;

      if (vertical) cr.x = axis - cr.width / 2;

      else cr.y = axis - cr.height / 2;

      axis += gap;

    }

  }

}



function centerMergeNodes(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  const { parents } = buildGraph(spec);

  const vertical = spec.direction === "TB";

  for (const n of spec.nodes) {

    const ps = parents.get(n.id) || [];

    if (ps.length < 2 || !layout.has(n.id)) continue;

    const centers = ps.map((p) => layout.get(p)).filter(Boolean) as LayoutRect[];

    if (!centers.length) continue;

    const r = layout.get(n.id)!;

    const avg = centers.reduce((s, c) => s + (vertical ? centerX(c) : centerY(c)), 0) / centers.length;

    if (vertical) r.x = avg - r.width / 2;

    else r.y = avg - r.height / 2;

  }

}



function addMergeClearance(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  const { parents } = buildGraph(spec);

  for (const n of spec.nodes) {

    if ((parents.get(n.id) || []).length < 2) continue;

    const r = layout.get(n.id);

    if (!r) continue;

    if (spec.direction === "TB") r.y += 12;

    else r.x += 12;

  }

}



function cleanupDanglingChains(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  const { children } = buildGraph(spec);

  const depth = bfsDepth(spec);

  for (const n of spec.nodes) {

    const ch = children.get(n.id) || [];

    if (ch.length !== 1 || n.kind === "decision") continue;

    const child = layout.get(ch[0]);

    const self = layout.get(n.id);

    if (!child || !self) continue;

    const dd = (depth.get(ch[0]) || 0) - (depth.get(n.id) || 0);

    if (dd === 1 && spec.direction === "TB") {

      const targetY = self.y + self.height + 88;

      if (child.y < targetY - 4) child.y = targetY;

    }

  }

}



function smoothRankDensity(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  const depth = bfsDepth(spec);

  const byDepth = new Map<number, LayoutRect[]>();

  for (const n of spec.nodes) {

    const d = depth.get(n.id) || 0;

    const r = layout.get(n.id);

    if (!r) continue;

    if (!byDepth.has(d)) byDepth.set(d, []);

    byDepth.get(d)!.push(r);

  }

  const rowGap = 98;

  const vertical = spec.direction === "TB";

  let base = Infinity;

  for (const r of layout.values()) base = Math.min(base, vertical ? r.y : r.x);

  if (!Number.isFinite(base)) base = 48;

  for (const [d, rects] of byDepth) {

    const target = snap(base + d * rowGap);

    for (const r of rects) {

      if (vertical) r.y = target;

      else r.x = target;

    }

  }

}



function resolveOverlaps(layout: Map<string, LayoutRect>, padding = 20): void {

  const ids = [...layout.keys()];

  for (let pass = 0; pass < 4; pass++) {

    ids.sort((a, b) => layout.get(a)!.y - layout.get(b)!.y || layout.get(a)!.x - layout.get(b)!.x);

    for (let i = 0; i < ids.length; i++) {

      for (let j = i + 1; j < ids.length; j++) {

        const a = layout.get(ids[i])!;

        const b = layout.get(ids[j])!;

        const ox = Math.min(a.x + a.width + padding - b.x, b.x + b.width + padding - a.x);

        const oy = Math.min(a.y + a.height + padding - b.y, b.y + b.height + padding - a.y);

        if (ox > 0 && oy > 0) b.x += ox;

      }

    }

  }

}



function addDecisionClearance(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  for (const n of spec.nodes) {

    if (n.kind !== "decision") continue;

    const r = layout.get(n.id);

    if (!r) continue;

    r.width = Math.max(r.width, 224);

    r.height = Math.max(r.height, 144);

  }

}



function offsetBackEdgeTargets(spec: FlowchartSpec, layout: Map<string, LayoutRect>): void {

  const backs = backEdges(spec.edges);

  if (!backs.length) return;

  const vertical = spec.direction === "TB";

  backs.forEach((e, i) => {

    const t = layout.get(e.to);

    if (!t) return;

    const lane = 28 + i * 18;

    if (vertical) t.x -= lane;

    else t.y -= lane;

  });

}



function centerGraph(layout: Map<string, LayoutRect>, padX = 72, padY = 56): void {

  let minX = Infinity;

  let minY = Infinity;

  for (const r of layout.values()) {

    minX = Math.min(minX, r.x);

    minY = Math.min(minY, r.y);

  }

  if (!Number.isFinite(minX)) return;

  const ox = padX - minX;

  const oy = padY - minY;

  for (const r of layout.values()) {

    r.x = snap(r.x + ox);

    r.y = snap(r.y + oy);

  }

}



/**

 * Deterministic beautify pass after dagre.

 */

export function beautifyFlowchartLayout(

  spec: FlowchartSpec,

  rawLayout: Map<string, LayoutRect>,

): Map<string, LayoutRect> {

  const layout = cloneMap(rawLayout);

  smoothRankDensity(spec, layout);

  reorderSiblingLayers(spec, layout);

  balanceSubtrees(spec, layout);

  centerMergeNodes(spec, layout);

  addMergeClearance(spec, layout);

  cleanupDanglingChains(spec, layout);

  addDecisionClearance(spec, layout);

  offsetBackEdgeTargets(spec, layout);

  resolveOverlaps(layout, 22);

  centerGraph(layout, 72, 56);

  for (const r of layout.values()) {

    r.x = snap(r.x);

    r.y = snap(r.y);

  }

  return layout;

}

