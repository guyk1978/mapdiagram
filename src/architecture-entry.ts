/**
 * Browser bundle entry for architecture compiler (existing tool.html integration).
 */
import * as ArchitectureEngine from "./architecture-spec";

export {
  ARCHITECTURE_JSON_SYSTEM_PROMPT,
  BILLING_RESERVE_CREDITS_PER_CALL,
  compileArchitectureSpecWithRetries,
  completeOpenAiThroughBillingGateway,
  extractJsonObject,
  layoutArchitectureGraph,
  layoutGraphPositions,
  rejectGenericTemplateArchitecture,
  renderDiagramFromSpec,
  userPromptForArchitectureAttempt,
  validateArchitectureSpec,
} from "./architecture-spec";

declare global {
  interface Window {
    ArchitectureEngine: typeof ArchitectureEngine;
  }
}

if (typeof window !== "undefined") {
  window.ArchitectureEngine = ArchitectureEngine;
}
