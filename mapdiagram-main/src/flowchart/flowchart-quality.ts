/**
 * Quality scoring for public indexing gates.
 */
export interface FlowchartQualityInput {
  title?: string;
  nodes?: Array<{ label?: string; title?: string; text?: string; kind?: string; type?: string }>;
  connections?: Array<{ label?: string; meta?: { isBackEdge?: boolean } }>;
  editCount?: number;
}

export interface FlowchartQualityResult {
  score: number;
  isIndexable: boolean;
  signals: {
    nodeCount: number;
    connectionCount: number;
    decisionCount: number;
    backEdgeCount: number;
    titleQuality: number;
    labelQuality: number;
    branchStructure: number;
    editBonus: number;
  };
}

const INDEX_THRESHOLD = 62;

function labelOf(n: FlowchartQualityInput["nodes"] extends (infer T)[] | undefined ? T : never): string {
  const rec = n as { label?: string; title?: string; text?: string };
  return String(rec.label || rec.title || rec.text || "").trim();
}

export function qualityScoreFlowchart(input: FlowchartQualityInput): FlowchartQualityResult {
  const nodes = input.nodes || [];
  const connections = input.connections || [];
  const nodeCount = nodes.length;
  const connectionCount = connections.length;
  const decisionCount = nodes.filter((n) => {
    const k = String(n.kind || n.type || "").toLowerCase();
    return k === "decision" || /\?$/.test(labelOf(n));
  }).length;
  const backEdgeCount = connections.filter((c) => c.meta?.isBackEdge).length;

  let titleQuality = 0;
  const title = String(input.title || "").trim();
  if (title.length >= 4 && title.length <= 80) titleQuality = 15;
  else if (title.length >= 2) titleQuality = 8;

  let labelQuality = 0;
  if (nodeCount) {
    const labels = nodes.map((n) => labelOf(n)).filter(Boolean);
    const avg = labels.reduce((s, l) => s + l.length, 0) / labels.length;
    const tooLong = labels.filter((l) => l.length > 48).length;
    const tooShort = labels.filter((l) => l.length < 2).length;
    if (avg >= 4 && avg <= 28 && tooLong === 0) labelQuality = 20;
    else if (tooShort <= 1) labelQuality = 12;
    else labelQuality = 6;
  }

  let branchStructure = 0;
  if (decisionCount >= 1 && connectionCount >= nodeCount) branchStructure = 18;
  else if (connectionCount >= 2) branchStructure = 10;

  const nodeScore = nodeCount >= 4 && nodeCount <= 22 ? 22 : nodeCount >= 3 ? 12 : 4;
  const editBonus = Math.min(10, Math.max(0, (input.editCount || 0) * 2));

  const score = Math.min(
    100,
    Math.round(nodeScore + titleQuality + labelQuality + branchStructure + editBonus + Math.min(15, backEdgeCount * 3)),
  );

  return {
    score,
    isIndexable: score >= INDEX_THRESHOLD && nodeCount >= 4 && titleQuality >= 8,
    signals: {
      nodeCount,
      connectionCount,
      decisionCount,
      backEdgeCount,
      titleQuality,
      labelQuality,
      branchStructure,
      editBonus,
    },
  };
}
