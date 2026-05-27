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
import { installGenealogyQuickActions, triggerFemaleSpawn, triggerMaleSpawn } from "./genealogy-quick-actions";

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
  installGenealogyQuickActions,
  triggerMaleSpawn,
  triggerFemaleSpawn,
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
  installGenealogyQuickActions,
  triggerMaleSpawn,
  triggerFemaleSpawn,
};

declare global {
  interface Window {
    FlowchartCompiler: typeof FlowchartCompiler;
    installGenealogyQuickActions: typeof installGenealogyQuickActions;
    genealogyAddSpouseAction?: (nodeId?: string) => void;
    genealogyAddChildAction?: (nodeId?: string) => void;
  }
}

if (typeof window !== "undefined") {
  window.FlowchartCompiler = FlowchartCompiler;
  (window as any).installGenealogyQuickActions = installGenealogyQuickActions;
  (window as any).installGenealogyQuickActions.triggerMaleSpawn = (selectedNodeId?: string) =>
    triggerMaleSpawn(window as any, selectedNodeId);
  (window as any).installGenealogyQuickActions.triggerFemaleSpawn = (selectedNodeId?: string) =>
    triggerFemaleSpawn(window as any, selectedNodeId);
  // Hard override legacy handlers so hardcoded tool.html buttons route to deterministic spawns.
  (window as any).genealogyAddSpouseAction = (nodeId?: string) => {
    triggerMaleSpawn(window as any, nodeId);
  };
  (window as any).genealogyAddChildAction = (nodeId?: string) => {
    triggerFemaleSpawn(window as any, nodeId);
  };
  const tryInstall = (attempt = 0) => {
    if (installGenealogyQuickActions(window)) return;
    if (attempt >= 24) return;
    window.setTimeout(() => tryInstall(attempt + 1), 200);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => tryInstall(), { once: true });
  } else {
    tryInstall();
  }
}

export default FlowchartCompiler;
