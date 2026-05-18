/**
 * Reveal animation plan for editor integration (DOM applied in tool.html).
 */
import type { FlowchartSpec } from "./flowchart-spec";
import type { DiagramPayload } from "./flowchart-compile";

export interface RevealPlan {
  /** Canvas node ids in reveal order */
  nodeIds: string[];
  /** Canvas connection ids (after nodes) */
  connectionIds: string[];
  staggerMs: number;
  respectReducedMotion: boolean;
}

export function buildRevealPlan(
  spec: FlowchartSpec,
  payload: DiagramPayload,
  options: { staggerMs?: number } = {},
): RevealPlan {
  const staggerMs = options.staggerMs ?? 50;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const nodeIds: string[] = [];
  for (const lid of payload.revealOrder) {
    const cid = payload.idMap.get(lid);
    if (cid) nodeIds.push(cid);
  }
  for (const n of payload.nodes) {
    if (!nodeIds.includes(n.id)) nodeIds.push(n.id);
  }

  const nodeSet = new Set(nodeIds);
  const connectionIds = payload.connections
    .filter((c) => nodeSet.has(c.from) && nodeSet.has(c.to))
    .map((c) => c.id);

  return {
    nodeIds,
    connectionIds,
    staggerMs: reduced ? 0 : staggerMs,
    respectReducedMotion: !!reduced,
  };
}
