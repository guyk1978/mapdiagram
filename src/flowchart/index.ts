/**
 * MapDiagram Flowchart Compiler — browser bundle entry.
 */
import {
  validateFlowchartSpec,
  extractJsonObject,
  FLOWCHART_LIMITS,
  forwardEdges,
  backEdges,
  computeForwardRanks,
} from "./flowchart-spec";
import { normalizeFlowchartSpec, coerceDraftSpec } from "./flowchart-normalize";
import { measureFlowchartLabel } from "./flowchart-label";
import { exportCanvasToFlowchartSpec } from "./flowchart-export-spec";
import { qualityScoreFlowchart } from "./flowchart-quality";
import { FLOWCHART_JSON_SYSTEM_PROMPT, userPromptForFlowchartAttempt } from "./flowchart-prompts";
import { layoutFlowchart, nodeDimensions } from "./flowchart-layout";
import { beautifyFlowchartLayout } from "./flowchart-beautify";
import { compileFlowchartToCanvas, type DiagramPayload } from "./flowchart-compile";
import {
  compileFlowchartSpecWithRetries,
  createMockFlowchartCompleter,
  type FlowchartCompleter,
} from "./flowchart-retry";
import { buildRevealPlan, type RevealPlan } from "./flowchart-reveal";
import { completeOpenAiThroughBillingGateway, BILLING_RESERVE_CREDITS_PER_CALL } from "../ai-service";

export type {
  FlowchartSpec,
  FlowchartLogicNode,
  FlowchartLogicEdge,
  FlowchartEdgeMeta,
  FlowchartDirection,
  FlowchartNodeKind,
  ValidateFlowchartResult,
} from "./flowchart-spec";
export type { LabelMeasure } from "./flowchart-label";
export type { ExportCanvasInput } from "./flowchart-export-spec";
export type { FlowchartQualityInput, FlowchartQualityResult } from "./flowchart-quality";
export type { CanvasConnectionMeta } from "./flowchart-compile";
export type { LayoutRect } from "./flowchart-layout";
export type { CanvasNode, CanvasConnection, DiagramPayload } from "./flowchart-compile";
export type { RevealPlan } from "./flowchart-reveal";
export type { FlowchartCompleter };

export {
  validateFlowchartSpec,
  extractJsonObject,
  FLOWCHART_LIMITS,
  forwardEdges,
  backEdges,
  computeForwardRanks,
  normalizeFlowchartSpec,
  coerceDraftSpec,
  measureFlowchartLabel,
  exportCanvasToFlowchartSpec,
  qualityScoreFlowchart,
  FLOWCHART_JSON_SYSTEM_PROMPT,
  userPromptForFlowchartAttempt,
  layoutFlowchart,
  beautifyFlowchartLayout,
  nodeDimensions,
  compileFlowchartToCanvas,
  compileFlowchartSpecWithRetries,
  createMockFlowchartCompleter,
  buildRevealPlan,
  completeOpenAiThroughBillingGateway,
  BILLING_RESERVE_CREDITS_PER_CALL,
};

/** Full pipeline: spec → layout → beautify → canvas payload */
export function compileFlowchartPipeline(
  spec: import("./flowchart-spec").FlowchartSpec,
  batchId: string,
  newId: () => string,
) {
  return compileFlowchartToCanvas(spec, batchId, newId);
}

const FlowchartCompiler = {
  validateFlowchartSpec,
  extractJsonObject,
  FLOWCHART_LIMITS,
  forwardEdges,
  backEdges,
  computeForwardRanks,
  normalizeFlowchartSpec,
  coerceDraftSpec,
  measureFlowchartLabel,
  exportCanvasToFlowchartSpec,
  qualityScoreFlowchart,
  FLOWCHART_JSON_SYSTEM_PROMPT,
  userPromptForFlowchartAttempt,
  layoutFlowchart,
  beautifyFlowchartLayout,
  nodeDimensions,
  compileFlowchartToCanvas,
  compileFlowchartPipeline,
  compileFlowchartSpecWithRetries,
  createMockFlowchartCompleter,
  buildRevealPlan,
  completeOpenAiThroughBillingGateway,
  BILLING_RESERVE_CREDITS_PER_CALL,
};

declare global {
  interface Window {
    FlowchartCompiler: typeof FlowchartCompiler;
  }
}

if (typeof window !== "undefined") {
  window.FlowchartCompiler = FlowchartCompiler;
}

export default FlowchartCompiler;
