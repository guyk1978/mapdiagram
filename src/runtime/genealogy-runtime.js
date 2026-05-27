/**
 * Genealogy source-of-truth extracted from editor runtime.
 * Keep this module in `src/` so compiler/runtime bundles own the behavior.
 */

export const GENEALOGY_WORKSPACE_PRESETS = [
  { libraryCategory: "profiles", label: "Male", type: "person", shape: "rect", previewShape: "gene-male", tooltip: "male-profile", genealogyRole: "male", color: "#6ea8fe", width: 160, height: 108 },
  { libraryCategory: "profiles", label: "Female", type: "person", shape: "circle", previewShape: "gene-female", tooltip: "female-profile", genealogyRole: "female", color: "#f472b6", width: 160, height: 108 },
  { libraryCategory: "connectors", label: "Parent link", type: "custom", shape: "arrow-down", previewShape: "gene-link-v", tooltip: "parent-link", genealogyRole: "link-v", color: "#cbd5e1", width: 72, height: 128 },
  { libraryCategory: "connectors", label: "Relational connector", type: "custom", shape: "rect", previewShape: "gene-link-h", tooltip: "spouse-link", genealogyRole: "link-h", color: "#94a3b8", width: 128, height: 64 },
  { libraryCategory: "connectors", label: "Union anchor", type: "custom", shape: "rect", previewShape: "gene-union", tooltip: "union-node", genealogyRole: "union", color: "transparent", width: 4, height: 4 },
];

export const GENEALOGY_SIDEBAR_TILE_SVG = {
  "gene-male":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="#ffffff" stroke-width="2" fill="none" style="width:18px;height:18px;display:block;flex-shrink:0"><rect x="5" y="5" width="14" height="14" rx="1.5"/><circle cx="12" cy="10" r="2.5" fill="#6EA8FE" stroke="#ffffff" stroke-width="1.5"/><path d="M8 18c.7-2.2 2-3.5 4-3.5s3.3 1.3 4 3.5"/></svg>',
  "gene-female":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="#ffffff" stroke-width="2" fill="none" style="width:18px;height:18px;display:block;flex-shrink:0"><ellipse cx="12" cy="9.5" rx="4.5" ry="4.5"/><path d="M6.5 19c1-2.8 2.6-4.2 5.5-4.2s4.5 1.4 5.5 4.2"/></svg>',
  "gene-link-h":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="#ffffff" stroke-width="2" fill="none" style="width:18px;height:18px;display:block;flex-shrink:0"><circle cx="8" cy="12" r="4.5"/><circle cx="16" cy="12" r="4.5"/><line x1="12.5" y1="12" x2="11.5" y2="12"/></svg>',
  "gene-link-v":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="#ffffff" stroke-width="2" fill="none" style="width:18px;height:18px;display:block;flex-shrink:0"><line x1="12" y1="4" x2="12" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/></svg>',
  "gene-union":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="#ffffff" stroke-width="2" fill="none" style="width:18px;height:18px;display:block;flex-shrink:0"><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="12" x2="12" y2="20"/><circle cx="12" cy="12" r="2" fill="#ffffff" stroke="none"/></svg>',
};

export function genealogySidebarTileSvg(preset) {
  const key = preset.previewShape || preset.genealogyRole || "";
  if (key === "male") return GENEALOGY_SIDEBAR_TILE_SVG["gene-male"];
  if (key === "female") return GENEALOGY_SIDEBAR_TILE_SVG["gene-female"];
  if (key === "link-h") return GENEALOGY_SIDEBAR_TILE_SVG["gene-link-h"];
  if (key === "link-v") return GENEALOGY_SIDEBAR_TILE_SVG["gene-link-v"];
  if (key === "union") return GENEALOGY_SIDEBAR_TILE_SVG["gene-union"];
  return GENEALOGY_SIDEBAR_TILE_SVG[key] || GENEALOGY_SIDEBAR_TILE_SVG["gene-male"];
}

export function genealogySidebarTileMarkup(preset) {
  const svg = genealogySidebarTileSvg(preset);
  const role = preset.genealogyRole;
  if (role === "male" || role === "female") {
    const tintClass = role === "female" ? "node-tile__gene-icon--female" : "node-tile__gene-icon--male";
    return `<span class="node-tile__gene-icon ${tintClass}" aria-hidden="true">${svg}</span>`;
  }
  return svg;
}

function getMarriageGeometry(a, b, getNodeWorldPosition) {
  const aw = getNodeWorldPosition(a);
  const bw = getNodeWorldPosition(b);
  const aCx = aw.x + a.width / 2;
  const bCx = bw.x + b.width / 2;
  const left = aCx <= bCx ? a : b;
  const right = left === a ? b : a;
  const lw = getNodeWorldPosition(left);
  const rw = getNodeWorldPosition(right);
  return {
    left,
    right,
    leftCy: lw.y + left.height / 2,
    rightCy: rw.y + right.height / 2,
    leftEdgeX: lw.x + left.width,
    rightEdgeX: rw.x,
  };
}

/**
 * Right-center of left partner -> Left-center of right partner.
 * Falls back to a clean orthogonal segment when vertical centers differ.
 */
export function layoutGenealogySpouseEdge(fromNode, toNode, getNodeWorldPosition) {
  const geo = getMarriageGeometry(fromNode, toNode, getNodeWorldPosition);
  const fromIsLeft = fromNode.id === geo.left.id;
  const leftAnchor = { x: geo.leftEdgeX, y: geo.leftCy, edge: "right" };
  const rightAnchor = { x: geo.rightEdgeX, y: geo.rightCy, edge: "left" };
  const from = fromIsLeft ? leftAnchor : rightAnchor;
  const to = fromIsLeft ? rightAnchor : leftAnchor;

  let d;
  if (Math.abs(leftAnchor.y - rightAnchor.y) < 2) {
    d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  } else {
    const midY = (from.y + to.y) / 2;
    d = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
  }
  return { from, to, d };
}
