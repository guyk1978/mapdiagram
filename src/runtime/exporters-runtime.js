/**
 * PNG/SVG export pipeline (extracted from tool.html).
 */

/** @type {{ ctx: import("./runtime-context.js").RuntimeContext, deps: Record<string, Function> } | null} */
let _bound = null;

function bind() {
  if (!_bound) throw new Error("[exporters-runtime] call createExportersRuntime(ctx, deps) first");
  return _bound;
}

export function createExportersRuntime(ctx, deps) {
  _bound = { ctx, deps };
  return exportersApi;
}

export function pngExportIncludesHiddenNodes() {
  return !!document.getElementById("pngExportIncludeHidden")?.checked;
}
export function getDiagramWorldBoundsForPngExport(p) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const bump = (x, y, w, h) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };
  for (const n of p.nodes) {
    if (bind().deps.isNodeHiddenCanvas(n) && !pngExportIncludesHiddenNodes()) continue;
    const w = bind().deps.getNodeWorldPosition(n);
    bump(w.x, w.y, n.width, n.height);
  }
  for (const g of p.userGroups || []) {
    const box = bind().deps.getUserGroupBox(g.id);
    if (box) bump(box.x, box.y, box.w, box.h);
  }
  if (!Number.isFinite(minX)) return null;
  const padExtra = bind().deps.isFlowchartMode() ? 32 : 16;
  return { minX: minX - padExtra, minY: minY - padExtra, maxX: maxX + padExtra, maxY: maxY + padExtra };
}

export function pngCtxSetLineDashFromEdge(ctx, edge) {
  const darr = bind().deps.connectionDashArray(edge.strokeDash);
  if (darr) {
    const parts = darr.split(/\s+/).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
    ctx.setLineDash(parts.length ? parts : []);
  } else ctx.setLineDash([]);
}

export function pngStrokePathD(ctx, dStr) {
  if (!dStr) return;
  try {
    ctx.stroke(new Path2D(dStr));
  } catch (_) {
    /* ignore malformed */
  }
}

export function pngDrawArrowAtTip(ctx, fromX, fromY, tipX, tipY, fillStyle, size = 7) {
  const ang = Math.atan2(tipY - fromY, tipX - fromX);
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.translate(tipX, tipY);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.42);
  ctx.lineTo(-size, size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function pngDrawEdgeLabel(ctx, txt, x, y, groupStyle) {
  const t = String(txt || "").trim();
  if (!t) return;
  ctx.save();
  ctx.font = "11px Inter, Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(10,12,22,0.92)";
  ctx.fillStyle = groupStyle ? "rgba(216,210,255,0.98)" : "rgba(228,236,255,0.98)";
  ctx.strokeText(t, x, y);
  ctx.fillText(t, x, y);
  ctx.restore();
}

/**
 * Phase 3 — rasterize diagram like the canvas: system underlays, system links, bridges, node–node (+labels), nodes.
 * Caller wraps with ctx.translate(tx, ty) so coordinates stay world-space (same as SVG layer).
 */
export function paintDiagramToPngContext(ctx, p) {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const sortedGroups = [...(p.userGroups || [])].sort((a, b) => {
    const z = (a.zIndex || 0) - (b.zIndex || 0);
    if (z !== 0) return z;
    return (a.hierarchyDepth || 0) - (b.hierarchyDepth || 0);
  });
  for (const g of sortedGroups) {
    if (bind().ctx.runtime.focusGroupId && bind().deps.isGroupOutsideFocus(g.id)) continue;
    const box = bind().deps.getUserGroupBox(g.id);
    if (!box) continue;
    const vars = bind().deps.groupColorVars(g.color);
    const depth = g.hierarchyDepth || 0;
    ctx.save();
    ctx.globalAlpha = 0.52 + Math.min(0.38, depth * 0.055);
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 14);
    ctx.fillStyle = vars.bg;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = vars.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  for (const gc of p.groupConnections || []) {
    bind().deps.normalizeConnectionEdge(gc);
    const fromBox = bind().deps.getUserGroupBox(gc.fromGroupId);
    const toBox = bind().deps.getUserGroupBox(gc.toGroupId);
    if (!fromBox || !toBox) continue;
    const anchors = bind().deps.smartGroupAnchors(fromBox, toBox);
    const from = anchors.from;
    const to = anchors.to;
    const obs = [
      ...bind().deps.nodesInsideGroupBoxObstacles(fromBox, new Set()),
      ...bind().deps.nodesInsideGroupBoxObstacles(toBox, new Set())
    ];
    const auto = bind().deps.autoCurve(from, to);
    const d =
      bind().ctx.runtime.connectorStyle === "orthogonal"
        ? bind().deps.orthogonalPath(from, to, obs)
        : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
    const col = bind().deps.connectionStrokeColorOrNull(gc) || "rgba(174, 147, 255, 0.96)";
    ctx.strokeStyle = col;
    ctx.lineWidth = bind().deps.connectionStrokeWidthPx(gc, 2.15);
    pngCtxSetLineDashFromEdge(ctx, gc);
    pngStrokePathD(ctx, d);
    ctx.setLineDash([]);
    pngDrawArrowAtTip(ctx, auto.cp2.x, auto.cp2.y, to.x, to.y, col, 7);
    if (gc.label) {
      const off = gc.labelOffset || { dx: 0, dy: 0 };
      pngDrawEdgeLabel(
        ctx,
        gc.label,
        (from.x + to.x) / 2 + (off.dx || 0),
        (from.y + to.y) / 2 - 6 + (off.dy || 0),
        true
      );
    }
  }

  for (const c of p.connections) {
    bind().deps.normalizeConnectionEdge(c);
    if (c.kind === "node-group") {
      const fromNode = bind().deps.getNodeById(c.from);
      const toBox = bind().deps.getUserGroupBox(c.toGroupId);
      if (!fromNode || !toBox) continue;
      const toCenter = { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 };
      const from = bind().deps.anchorNodeForConnection(c.from, "from", toCenter);
      const to = bind().deps.groupAnchor(toBox, "in", from);
      const auto = bind().deps.autoCurve(from, to);
      const obsRects = p.nodes
        .filter((n) => n.id !== c.from)
        .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
        .map((n) => {
          const w = bind().deps.getNodeWorldPosition(n);
          return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
        })
        .concat(bind().deps.nodesInsideGroupBoxObstacles(toBox, new Set([c.from])));
      const d =
        bind().ctx.runtime.connectorStyle === "orthogonal"
          ? bind().deps.orthogonalPath(from, to, obsRects)
          : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
      const col = bind().deps.connectionStrokeColorOrNull(c) || "rgba(120,210,255,0.9)";
      ctx.strokeStyle = col;
      ctx.lineWidth = bind().deps.connectionStrokeWidthPx(c, 2.15);
      pngCtxSetLineDashFromEdge(ctx, c);
      pngStrokePathD(ctx, d);
      ctx.setLineDash([]);
      pngDrawArrowAtTip(ctx, auto.cp2.x, auto.cp2.y, to.x, to.y, col, 7);
      if (String(c.label || "").trim()) {
        const off = c.labelOffset || { dx: 0, dy: 0 };
        pngDrawEdgeLabel(
          ctx,
          c.label,
          (from.x + to.x) / 2 + (off.dx || 0),
          (from.y + to.y) / 2 - 4 + (off.dy || 0),
          false
        );
      }
      continue;
    }
    if (c.kind === "group-node") {
      const toNode = bind().deps.getNodeById(c.to);
      const fromBox = bind().deps.getUserGroupBox(c.fromGroupId);
      if (!toNode || !fromBox) continue;
      const from = bind().deps.groupAnchor(fromBox, "out", bind().deps.anchor(toNode, "in", { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 }));
      const to = bind().deps.anchorNodeForConnection(c.to, "to", from);
      const auto = bind().deps.autoCurve(from, to);
      const obsRects = p.nodes
        .filter((n) => n.id !== c.to)
        .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
        .map((n) => {
          const w = bind().deps.getNodeWorldPosition(n);
          return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
        })
        .concat(bind().deps.nodesInsideGroupBoxObstacles(fromBox, new Set([c.to])));
      const d =
        bind().ctx.runtime.connectorStyle === "orthogonal"
          ? bind().deps.orthogonalPath(from, to, obsRects)
          : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
      const col = bind().deps.connectionStrokeColorOrNull(c) || "rgba(120,210,255,0.9)";
      ctx.strokeStyle = col;
      ctx.lineWidth = bind().deps.connectionStrokeWidthPx(c, 2.15);
      pngCtxSetLineDashFromEdge(ctx, c);
      pngStrokePathD(ctx, d);
      ctx.setLineDash([]);
      pngDrawArrowAtTip(ctx, auto.cp2.x, auto.cp2.y, to.x, to.y, col, 7);
      if (String(c.label || "").trim()) {
        const off = c.labelOffset || { dx: 0, dy: 0 };
        pngDrawEdgeLabel(
          ctx,
          c.label,
          (from.x + to.x) / 2 + (off.dx || 0),
          (from.y + to.y) / 2 - 4 + (off.dy || 0),
          false
        );
      }
      continue;
    }
    if (bind().deps.isBranchFromConnection(c)) continue;
    if (!bind().deps.isNodeNodeConnection(c)) continue;
    const fromNode = bind().deps.getNodeById(c.from);
    const toNode = bind().deps.getNodeById(c.to);
    if (!fromNode || !toNode) continue;
    const toPre = bind().deps.anchorNodeForConnection(c.to, "to", bind().deps.anchor(fromNode, "out", bind().deps.nodeWorldCenter(toNode)));
    const from = bind().deps.anchorNodeForConnection(c.from, "from", toPre);
    const to = bind().deps.anchorNodeForConnection(c.to, "to", from);
    const curve = bind().deps.getCurveData(c.id, from, to, c);
    const obstacles = p.nodes
      .filter((n) => n.id !== fromNode.id && n.id !== toNode.id)
      .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
      .map((n) => {
        const w = bind().deps.getNodeWorldPosition(n);
        return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
      });
    const d =
      bind().ctx.runtime.connectorStyle === "orthogonal"
        ? bind().deps.orthogonalPath(from, to, obstacles)
        : bind().deps.curvePath(from, curve.cp1, curve.cp2, to);
    const lw = bind().deps.connectionStrokeWidthPx(c, 2.25);
    const customNn = bind().deps.connectionStrokeColorOrNull(c);
    const hasDash = !!bind().deps.connectionDashArray(c.strokeDash);
    pngCtxSetLineDashFromEdge(ctx, c);
    if (customNn) {
      ctx.strokeStyle = customNn;
      ctx.lineWidth = lw;
      pngStrokePathD(ctx, d);
    } else if (hasDash) {
      ctx.strokeStyle = "rgba(155,187,255,.92)";
      ctx.lineWidth = lw;
      pngStrokePathD(ctx, d);
    } else {
      const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      grad.addColorStop(0, "rgba(126, 154, 230, 0.72)");
      grad.addColorStop(0.55, "rgba(184, 206, 255, 0.92)");
      grad.addColorStop(1, "rgba(126, 154, 230, 0.72)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = lw;
      pngStrokePathD(ctx, d);
    }
    ctx.setLineDash([]);
    const tipCol = customNn || "rgba(184, 206, 255, 0.95)";
    pngDrawArrowAtTip(ctx, curve.cp2.x, curve.cp2.y, to.x, to.y, tipCol, 7);
    if (String(c.label || "").trim()) {
      const off = c.labelOffset || { dx: 0, dy: 0 };
      pngDrawEdgeLabel(
        ctx,
        c.label,
        (from.x + to.x) / 2 + (off.dx || 0),
        (from.y + to.y) / 2 - 4 + (off.dy || 0),
        false
      );
    }
  }

  for (const c of p.connections) {
    if (!bind().deps.isBranchFromConnection(c)) continue;
    bind().deps.normalizeConnectionEdge(c);
    const parent = p.connections.find((x) => x.id === c.parentConnectionId);
    const toNode = bind().deps.getNodeById(c.to);
    if (!parent || !bind().deps.isNodeNodeConnection(parent) || !toNode) continue;
    const lay = bind().deps.getNodeNodeEdgeLayout(parent, p);
    if (!lay || !lay.d) continue;
    const junc = bind().deps.pathWorldPointAtParam(lay.d, c.t ?? 0.5);
    if (!junc) continue;
    const fromPt = junc;
    const to = bind().deps.anchorNodeForConnection(c.to, "to", fromPt);
    const curve = bind().deps.getCurveData(c.id, fromPt, to, c);
    const obstacles = p.nodes
      .filter((n) => n.id !== toNode.id && n.id !== lay.fromNode.id && n.id !== lay.toNode.id)
      .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
      .map((n) => {
        const w = bind().deps.getNodeWorldPosition(n);
        return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
      });
    const dBr =
      bind().ctx.runtime.connectorStyle === "orthogonal"
        ? bind().deps.orthogonalPath(fromPt, to, obstacles)
        : bind().deps.curvePath(fromPt, curve.cp1, curve.cp2, to);
    const lw = bind().deps.connectionStrokeWidthPx(c, 2.05);
    const customBr = bind().deps.connectionStrokeColorOrNull(c);
    pngCtxSetLineDashFromEdge(ctx, c);
    ctx.strokeStyle = customBr || "rgba(140, 200, 255, 0.9)";
    ctx.lineWidth = lw;
    pngStrokePathD(ctx, dBr);
    ctx.setLineDash([]);
    const tipCol = customBr || "rgba(184, 206, 255, 0.95)";
    pngDrawArrowAtTip(ctx, curve.cp2.x, curve.cp2.y, to.x, to.y, tipCol, 7);
    if (String(c.label || "").trim()) {
      const off = c.labelOffset || { dx: 0, dy: 0 };
      pngDrawEdgeLabel(
        ctx,
        c.label,
        (fromPt.x + to.x) / 2 + (off.dx || 0),
        (fromPt.y + to.y) / 2 - 4 + (off.dy || 0),
        false
      );
    }
  }

  for (const n of p.nodes) {
    if (bind().deps.isNodeHiddenCanvas(n) && !pngExportIncludesHiddenNodes()) continue;
    bind().deps.normalizeNode(n);
    const st = bind().deps.ensureNodeStyle(n);
    const w = bind().deps.getNodeWorldPosition(n);
    const x = w.x;
    const y = w.y;
    const rad = Math.max(0, Number(st.radius) || 12);
    const bw = Math.max(0, Math.min(6, Number(st.borderWidth) || 1.5));
    ctx.globalAlpha = Math.max(0.2, Math.min(1, Number(st.opacity) || 0.9));
    ctx.fillStyle = n.color || "#ffd482";
    ctx.strokeStyle = st.borderColor || "#9cb8ff";
    ctx.lineWidth = bw;
    const shp = n.shape || "rect";
    ctx.beginPath();
    if (shp === "circle") {
      ctx.ellipse(x + n.width / 2, y + n.height / 2, n.width / 2, n.height / 2, 0, 0, Math.PI * 2);
    } else if (shp === "diamond") {
      const cx = x + n.width / 2;
      const cy = y + n.height / 2;
      ctx.moveTo(cx, y);
      ctx.lineTo(x + n.width, cy);
      ctx.lineTo(cx, y + n.height);
      ctx.lineTo(x, cy);
      ctx.closePath();
    } else {
      const rr = shp === "rounded" ? Math.max(rad, 14) : rad;
      ctx.roundRect(x, y, n.width, n.height, rr);
    }
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    const titleFill = isLight ? "#0f172a" : "#e8edff";
    const subFill = isLight ? "rgba(15,23,42,.85)" : "rgba(228,236,255,.85)";
    const px = Math.max(10, Math.min(28, Number(st.titleFontSize) || 14));
    const wgt = [400, 500, 600, 700].includes(Number(st.titleFontWeight)) ? Number(st.titleFontWeight) : 600;
    const fam = bind().deps.nodeTitleFontStackCss(st);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = x + n.width / 2;
    const cy = y + n.height / 2;
    const title = n.title || n.text || "Node";
    if (st.freeform) {
      ctx.fillStyle = titleFill;
      ctx.font = `${wgt} ${px}px ${fam}`;
      ctx.fillText(title, cx, cy);
    } else {
      const hasSub = !!String(n.subtitle || "").trim();
      const hasDesc = !!String(n.description || "").trim();
      let y0 = cy;
      if (hasSub && hasDesc) y0 = cy - 18;
      else if (hasSub || hasDesc) y0 = cy - 10;
      ctx.fillStyle = titleFill;
      ctx.font = `${wgt} ${px}px ${fam}`;
      ctx.fillText(title, cx, y0);
      if (hasSub) {
        ctx.font = `500 12px ${fam}`;
        ctx.fillStyle = subFill;
        ctx.fillText(n.subtitle, cx, y0 + 16);
      }
      if (hasDesc) {
        ctx.font = `400 11px ${fam}`;
        ctx.fillStyle = isLight ? "rgba(15,23,42,.72)" : "rgba(228,236,255,.72)";
        ctx.fillText(String(n.description).slice(0, 68), cx, y0 + (hasSub ? 32 : 16));
      }
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}

export function paintPngWatermark(ctx, w, h) {
  if (!bind().deps.isFlowchartMode()) return;
  const label = "MapDiagram";
  ctx.save();
  ctx.font = "11px Inter, Segoe UI, Arial";
  ctx.fillStyle = "rgba(169, 188, 230, 0.42)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, w - 14, h - 10);
  ctx.restore();
}

export function svgExportEscape(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function svgExportParseHexColor(hex) {
  const s = String(hex || "").trim();
  const m3 = /^#([0-9a-f]{3})$/i.exec(s);
  if (m3) {
    const h = m3[1];
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16)
    };
  }
  const m6 = /^#([0-9a-f]{6})$/i.exec(s);
  if (m6) {
    const h = m6[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }
  return null;
}

export function svgExportIsLightFill(color) {
  const rgb = svgExportParseHexColor(color);
  if (!rgb) return false;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.62;
}

export function svgExportNormalizeHex(color) {
  const s = String(color || "").trim();
  if (!s) return null;
  const rgb = svgExportParseHexColor(s);
  if (!rgb) return null;
  const h = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

const SVG_EXPORT_LIGHT_FILL = "#f5f5f5";
const SVG_EXPORT_DARK_FILL = "#1e1e1e";
const SVG_EXPORT_LIGHT_TEXT = "#111111";
const SVG_EXPORT_DARK_TEXT = "#ffffff";

export function svgExportRawNodeColor(n) {
  const raw = n.fill ?? n.color ?? n.style?.fill ?? null;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s ? s : null;
}

/** Data-driven node paint — no DOM / getComputedStyle. */
export function svgExportResolveNodePaint(n, theme) {
  const st = bind().deps.ensureNodeStyle(n);
  const hex = svgExportNormalizeHex(svgExportRawNodeColor(n));
  const shapeFill = hex || (theme.isLight ? SVG_EXPORT_LIGHT_FILL : SVG_EXPORT_DARK_FILL);
  const bgLight = svgExportIsLightFill(shapeFill);
  const textFill = bgLight ? SVG_EXPORT_LIGHT_TEXT : SVG_EXPORT_DARK_TEXT;
  const textStyle = bgLight ? "fill: #111111 !important;" : "fill: #ffffff !important;";
  let stroke = bgLight ? "#c4c4c4" : "#4a4a4a";
  const borderHex = svgExportNormalizeHex(st.borderColor);
  if (borderHex) stroke = borderHex;
  else if (hex) stroke = hex;
  return {
    fill: shapeFill,
    stroke,
    textFill,
    textStyle,
    borderWidth: Math.max(0, Math.min(6, Number(st.borderWidth) || 1.5)),
    opacity: Math.max(0.2, Math.min(1, Number(st.opacity) || 0.9))
  };
}

/** Active app theme tokens for standalone SVG (hardcoded hex, no DOM reads). */
export function getSvgExportTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const workspaceBg =
    document.getElementById("canvasBgColor")?.value || (isLight ? "#e8edf7" : "#0b0f1a");
  return {
    isLight,
    workspaceBg,
    defaultNodeAccent: isLight ? "#8fb2ff" : "#ffd482",
    connStroke: isLight ? "rgba(70, 95, 150, 0.72)" : "rgba(151, 180, 255, 0.85)",
    connStrokeDash: isLight ? "rgba(90, 115, 170, 0.78)" : "rgba(169, 195, 255, 0.88)",
    connGrad0: isLight ? "#6e8fc4" : "#7e9ae6",
    connGrad1: isLight ? "#a8bce8" : "#b8ceff",
    connGroup: isLight ? "#8f7de8" : "#ae93ff",
    connBridge: isLight ? "#5a9fd4" : "#78d2ff",
    connBranch: isLight ? "#6a9fd8" : "#8cc8ff",
    connLabel: isLight ? "#1e2840" : "#e4ecff",
    connLabelHalo: isLight ? "rgba(255, 255, 255, 0.92)" : "rgba(10, 12, 22, 0.9)",
    arrowFill: isLight ? "#5a7098" : "#b4c8ff",
    watermark: isLight ? "rgba(90, 110, 150, 0.38)" : "rgba(169, 188, 230, 0.42)"
  };
}

export function svgExportEmbeddedStyleBlock(theme) {
  return `<style type="text/css"><![CDATA[
    path.conn { fill: none; stroke: ${theme.connStroke}; stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; opacity: 0.96; }
    path.conn.conn-dashed { stroke: ${theme.connStrokeDash}; stroke-width: 2.1; stroke-dasharray: 7 6; opacity: 0.94; }
    path.conn.conn-group { stroke: ${theme.connGroup}; stroke-width: 2.15; }
    path.conn.conn-branch { stroke: ${theme.connBranch}; stroke-width: 2.05; opacity: 0.93; }
    .conn-edge-label, text.conn-label { font-family: Inter, "Segoe UI", Arial, sans-serif; font-size: 11px; fill: ${theme.connLabel}; }
  ]]></style>`;
}

export function svgExportDefsBlock(theme) {
  return [
    `<linearGradient id="md-export-conn-grad" gradientUnits="objectBoundingBox" x1="0%" y1="0%" x2="100%" y2="0%">`,
    `<stop offset="0%" stop-color="${svgExportEscape(theme.connGrad0)}"/>`,
    `<stop offset="55%" stop-color="${svgExportEscape(theme.connGrad1)}"/>`,
    `<stop offset="100%" stop-color="${svgExportEscape(theme.connGrad0)}"/>`,
    `</linearGradient>`,
    `<marker id="md-export-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth">`,
    `<path d="M0,0 L9,4.5 L0,9 Z" fill="${svgExportEscape(theme.arrowFill)}"/>`,
    `</marker>`
  ].join("\n");
}

export function svgExportResolveConnStroke(c, theme, groupStyle, branch) {
  const custom = bind().deps.connectionStrokeColorOrNull(c);
  if (custom) return { stroke: custom, marker: "url(#md-export-arrow)", classExtra: "" };
  const dash = bind().deps.connectionDashArray(c.strokeDash);
  if (dash) {
    return {
      stroke: theme.connStrokeDash,
      marker: "url(#md-export-arrow)",
      classExtra: " conn-dashed",
      dashAttr: ` stroke-dasharray="${dash}"`
    };
  }
  if (branch) {
    return { stroke: theme.connBranch, marker: "url(#md-export-arrow)", classExtra: " conn-branch" };
  }
  if (groupStyle) {
    return { stroke: theme.connGroup, marker: "url(#md-export-arrow)", classExtra: " conn-group" };
  }
  if (
    c.kind === "node-group" ||
    c.kind === "group-node" ||
    c.kind === "node-flowgroup" ||
    c.kind === "flowgroup-node" ||
    c.kind === "flowgroup-flowgroup"
  ) {
    return { stroke: theme.connBridge, marker: "url(#md-export-arrow)", classExtra: "" };
  }
  return {
    stroke: "url(#md-export-conn-grad)",
    marker: "url(#md-export-arrow)",
    classExtra: ""
  };
}

export function svgExportPushEdge(parts, d, c, groupStyle, from, to, theme) {
  if (!d || !theme) return;
  const lw = bind().deps.connectionStrokeWidthPx(c, groupStyle ? 2.15 : bind().deps.isBranchFromConnection(c) ? 2.05 : 2.25);
  const strokeSpec = svgExportResolveConnStroke(c, theme, groupStyle, bind().deps.isBranchFromConnection(c));
  const dashAttr = strokeSpec.dashAttr || "";
  parts.push(
    `<path class="conn${strokeSpec.classExtra || ""}" d="${svgExportEscape(d)}" fill="none" stroke="${svgExportEscape(strokeSpec.stroke)}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"${dashAttr} marker-end="${strokeSpec.marker}"/>`
  );
  const lbl = String(c.label || "").trim();
  if (lbl) {
    const off = c.labelOffset || { dx: 0, dy: 0 };
    const lx = (from.x + to.x) / 2 + (off.dx || 0);
    const ly = (from.y + to.y) / 2 - (groupStyle ? 6 : 4) + (off.dy || 0);
    const labelFill = groupStyle ? theme.connGroup : theme.connLabel;
    parts.push(
      `<text class="conn-edge-label" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Segoe UI, Arial" font-size="11" fill="${svgExportEscape(labelFill)}" stroke="${svgExportEscape(theme.connLabelHalo)}" stroke-width="3" paint-order="stroke">${svgExportEscape(lbl)}</text>`
    );
  }
}

export function svgExportPushNodeText(parts, attrs, paint, content) {
  parts.push(
    `<text ${attrs} fill="${svgExportEscape(paint.textFill)}" style="${svgExportEscape(paint.textStyle)}">${svgExportEscape(content)}</text>`
  );
}

export function svgExportPushNode(parts, n, theme) {
  bind().deps.normalizeNode(n);
  const st = bind().deps.ensureNodeStyle(n);
  const paint = svgExportResolveNodePaint(n, theme);
  const wpos = bind().deps.getNodeWorldPosition(n);
  const x = wpos.x;
  const y = wpos.y;
  const rad = Math.max(0, Number(st.radius) || 12);
  const bw = paint.borderWidth;
  const opacity = paint.opacity;
  const shp = n.shape || "rect";
  const px = Math.max(10, Math.min(28, Number(st.titleFontSize) || 14));
  const wgt = [400, 500, 600, 700].includes(Number(st.titleFontWeight)) ? Number(st.titleFontWeight) : 600;
  const fam = "Inter, Segoe UI, Arial";
  const textBase =
    `text-anchor="middle" dominant-baseline="middle" font-family="${fam}"`;
  parts.push(
    `<g class="node" data-node-id="${svgExportEscape(n.id)}" transform="translate(${x},${y})" opacity="${opacity}">`
  );
  if (shp === "circle") {
    parts.push(
      `<ellipse cx="${n.width / 2}" cy="${n.height / 2}" rx="${n.width / 2}" ry="${n.height / 2}" fill="${svgExportEscape(paint.fill)}" stroke="${svgExportEscape(paint.stroke)}" stroke-width="${bw}"/>`
    );
  } else if (shp === "diamond") {
    const cx = n.width / 2;
    const cy = n.height / 2;
    const pts = `${cx},0 ${n.width},${cy} ${cx},${n.height} 0,${cy}`;
    parts.push(
      `<polygon points="${pts}" fill="${svgExportEscape(paint.fill)}" stroke="${svgExportEscape(paint.stroke)}" stroke-width="${bw}"/>`
    );
  } else {
    const rr = shp === "rounded" ? Math.max(rad, 14) : rad;
    parts.push(
      `<rect width="${n.width}" height="${n.height}" rx="${rr}" fill="${svgExportEscape(paint.fill)}" stroke="${svgExportEscape(paint.stroke)}" stroke-width="${bw}"/>`
    );
  }
  const title = n.title || n.text || "Node";
  const cx = n.width / 2;
  const cy = n.height / 2;
  if (st.freeform) {
    svgExportPushNodeText(
      parts,
      `x="${cx}" y="${cy}" ${textBase} font-size="${px}" font-weight="${wgt}"`,
      paint,
      title
    );
  } else {
    const hasSub = !!String(n.subtitle || "").trim();
    const hasDesc = !!String(n.description || "").trim();
    let y0 = cy;
    if (hasSub && hasDesc) y0 = cy - 18;
    else if (hasSub || hasDesc) y0 = cy - 10;
    svgExportPushNodeText(
      parts,
      `x="${cx}" y="${y0}" ${textBase} font-size="${px}" font-weight="${wgt}"`,
      paint,
      title
    );
    if (hasSub) {
      svgExportPushNodeText(
        parts,
        `x="${cx}" y="${y0 + 16}" ${textBase} font-size="12" font-weight="500"`,
        paint,
        n.subtitle
      );
    }
    if (hasDesc) {
      svgExportPushNodeText(
        parts,
        `x="${cx}" y="${y0 + (hasSub ? 32 : 16)}" ${textBase} font-size="11" font-weight="400"`,
        paint,
        String(n.description).slice(0, 68)
      );
    }
  }
  parts.push("</g>");
}

export function svgExportPushAllEdgesFromData(parts, p, theme) {
  for (const gc of p.groupConnections || []) {
    bind().deps.normalizeConnectionEdge(gc);
    const fromBox = bind().deps.getUserGroupBox(gc.fromGroupId);
    const toBox = bind().deps.getUserGroupBox(gc.toGroupId);
    if (!fromBox || !toBox) continue;
    const anchors = bind().deps.smartGroupAnchors(fromBox, toBox);
    const from = anchors.from;
    const to = anchors.to;
    const obs = [
      ...bind().deps.nodesInsideGroupBoxObstacles(fromBox, new Set()),
      ...bind().deps.nodesInsideGroupBoxObstacles(toBox, new Set())
    ];
    const auto = bind().deps.autoCurve(from, to);
    const d =
      bind().ctx.runtime.connectorStyle === "orthogonal"
        ? bind().deps.orthogonalPath(from, to, obs)
        : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
    svgExportPushEdge(parts, d, gc, true, from, to, theme);
  }
  for (const c of p.connections) {
    bind().deps.normalizeConnectionEdge(c);
    if (c.kind === "node-group") {
      const fromNode = bind().deps.getNodeById(c.from);
      const toBox = bind().deps.getUserGroupBox(c.toGroupId);
      if (!fromNode || !toBox) continue;
      const toCenter = { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 };
      const from = bind().deps.anchorNodeForConnection(c.from, "from", toCenter);
      const to = bind().deps.groupAnchor(toBox, "in", from);
      const auto = bind().deps.autoCurve(from, to);
      const obsRects = p.nodes
        .filter((n) => n.id !== c.from)
        .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
        .map((n) => {
          const w = bind().deps.getNodeWorldPosition(n);
          return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
        })
        .concat(bind().deps.nodesInsideGroupBoxObstacles(toBox, new Set([c.from])));
      const d =
        bind().ctx.runtime.connectorStyle === "orthogonal"
          ? bind().deps.orthogonalPath(from, to, obsRects)
          : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
      svgExportPushEdge(parts, d, c, false, from, to, theme);
      continue;
    }
    if (c.kind === "group-node") {
      const toNode = bind().deps.getNodeById(c.to);
      const fromBox = bind().deps.getUserGroupBox(c.fromGroupId);
      if (!toNode || !fromBox) continue;
      const from = bind().deps.groupAnchor(fromBox, "out", bind().deps.anchor(toNode, "in", { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 }));
      const to = bind().deps.anchorNodeForConnection(c.to, "to", from);
      const auto = bind().deps.autoCurve(from, to);
      const obsRects = p.nodes
        .filter((n) => n.id !== c.to)
        .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
        .map((n) => {
          const w = bind().deps.getNodeWorldPosition(n);
          return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
        })
        .concat(bind().deps.nodesInsideGroupBoxObstacles(fromBox, new Set([c.to])));
      const d =
        bind().ctx.runtime.connectorStyle === "orthogonal"
          ? bind().deps.orthogonalPath(from, to, obsRects)
          : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
      svgExportPushEdge(parts, d, c, false, from, to, theme);
      continue;
    }
    if (c.kind === "node-flowgroup") {
      const fromNode = bind().deps.getNodeById(c.from);
      const toBox = bind().deps.getFlowGroupBox(c.toFlowGroupId);
      if (!fromNode || !toBox) continue;
      const toCenter = { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 };
      const from = bind().deps.anchorNodeForConnection(c.from, "from", toCenter);
      const to = bind().deps.groupAnchor(toBox, "in", from);
      const auto = bind().deps.autoCurve(from, to);
      const obsRects = p.nodes
        .filter((n) => n.id !== c.from)
        .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
        .map((n) => {
          const w = bind().deps.getNodeWorldPosition(n);
          return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
        })
        .concat(bind().deps.nodesInsideGroupBoxObstacles(toBox, new Set([c.from])));
      const d =
        bind().ctx.runtime.connectorStyle === "orthogonal"
          ? bind().deps.orthogonalPath(from, to, obsRects)
          : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
      svgExportPushEdge(parts, d, c, false, from, to, theme);
      continue;
    }
    if (c.kind === "flowgroup-node") {
      const toNode = bind().deps.getNodeById(c.to);
      const fromBox = bind().deps.getFlowGroupBox(c.fromFlowGroupId);
      if (!toNode || !fromBox) continue;
      const from = bind().deps.groupAnchor(fromBox, "out", bind().deps.anchor(toNode, "in", { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 }));
      const to = bind().deps.anchorNodeForConnection(c.to, "to", from);
      const auto = bind().deps.autoCurve(from, to);
      const obsRects = p.nodes
        .filter((n) => n.id !== c.to)
        .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
        .map((n) => {
          const w = bind().deps.getNodeWorldPosition(n);
          return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
        })
        .concat(bind().deps.nodesInsideGroupBoxObstacles(fromBox, new Set([c.to])));
      const d =
        bind().ctx.runtime.connectorStyle === "orthogonal"
          ? bind().deps.orthogonalPath(from, to, obsRects)
          : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
      svgExportPushEdge(parts, d, c, false, from, to, theme);
      continue;
    }
    if (c.kind === "flowgroup-flowgroup") {
      const fromBox = bind().deps.getFlowGroupBox(c.fromFlowGroupId);
      const toBox = bind().deps.getFlowGroupBox(c.toFlowGroupId);
      if (!fromBox || !toBox) continue;
      const anchors = bind().deps.smartGroupAnchors(fromBox, toBox);
      const from = anchors.from;
      const to = anchors.to;
      const obs = [
        ...bind().deps.nodesInsideGroupBoxObstacles(fromBox, new Set()),
        ...bind().deps.nodesInsideGroupBoxObstacles(toBox, new Set())
      ];
      const auto = bind().deps.autoCurve(from, to);
      const d =
        bind().ctx.runtime.connectorStyle === "orthogonal"
          ? bind().deps.orthogonalPath(from, to, obs)
          : bind().deps.curvePath(from, auto.cp1, auto.cp2, to);
      svgExportPushEdge(parts, d, c, false, from, to, theme);
      continue;
    }
    if (bind().deps.isBranchFromConnection(c)) continue;
    if (!bind().deps.isNodeNodeConnection(c)) continue;
    const fromNode = bind().deps.getNodeById(c.from);
    const toNode = bind().deps.getNodeById(c.to);
    if (!fromNode || !toNode) continue;
    const toPre = bind().deps.anchorNodeForConnection(c.to, "to", bind().deps.anchor(fromNode, "out", bind().deps.nodeWorldCenter(toNode)));
    const from = bind().deps.anchorNodeForConnection(c.from, "from", toPre);
    const to = bind().deps.anchorNodeForConnection(c.to, "to", from);
    const curve = bind().deps.getCurveData(c.id, from, to, c);
    const obstacles = p.nodes
      .filter((n) => n.id !== fromNode.id && n.id !== toNode.id)
      .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
      .map((n) => {
        const w = bind().deps.getNodeWorldPosition(n);
        return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
      });
    const d =
      bind().ctx.runtime.connectorStyle === "orthogonal"
        ? bind().deps.orthogonalPath(from, to, obstacles)
        : bind().deps.curvePath(from, curve.cp1, curve.cp2, to);
    svgExportPushEdge(parts, d, c, false, from, to, theme);
  }
  for (const c of p.connections) {
    if (!bind().deps.isBranchFromConnection(c)) continue;
    bind().deps.normalizeConnectionEdge(c);
    const parent = p.connections.find((x) => x.id === c.parentConnectionId);
    const toNode = bind().deps.getNodeById(c.to);
    if (!parent || !bind().deps.isNodeNodeConnection(parent) || !toNode) continue;
    const lay = bind().deps.getNodeNodeEdgeLayout(parent, p);
    if (!lay || !lay.d) continue;
    const junc = bind().deps.pathWorldPointAtParam(lay.d, c.t ?? 0.5);
    if (!junc) continue;
    const fromPt = junc;
    const to = bind().deps.anchorNodeForConnection(c.to, "to", fromPt);
    const curve = bind().deps.getCurveData(c.id, fromPt, to, c);
    const obstacles = p.nodes
      .filter((n) => n.id !== toNode.id && n.id !== lay.fromNode.id && n.id !== lay.toNode.id)
      .filter((n) => !bind().deps.isNodeHiddenCanvas(n))
      .map((n) => {
        const w = bind().deps.getNodeWorldPosition(n);
        return { x: w.x - 12, y: w.y - 12, w: n.width + 24, h: n.height + 24 };
      });
    const dBr =
      bind().ctx.runtime.connectorStyle === "orthogonal"
        ? bind().deps.orthogonalPath(fromPt, to, obstacles)
        : bind().deps.curvePath(fromPt, curve.cp1, curve.cp2, to);
    svgExportPushEdge(parts, dBr, c, false, fromPt, to, theme);
  }
}

/** Build diagram SVG fragments (systems, links, nodes) — mirrors paintDiagramToPngContext with baked styles. */
export function paintDiagramToSvgParts(parts, p, theme) {
  const sortedGroups = [...(p.userGroups || [])].sort((a, b) => {
    const z = (a.zIndex || 0) - (b.zIndex || 0);
    if (z !== 0) return z;
    return (a.hierarchyDepth || 0) - (b.hierarchyDepth || 0);
  });
  for (const g of sortedGroups) {
    if (bind().ctx.runtime.focusGroupId && bind().deps.isGroupOutsideFocus(g.id)) continue;
    const box = bind().deps.getUserGroupBox(g.id);
    if (!box) continue;
    const vars = bind().deps.groupColorVars(g.color);
    const depth = g.hierarchyDepth || 0;
    const alpha = 0.52 + Math.min(0.38, depth * 0.055);
    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="14" fill="${svgExportEscape(vars.bg)}" stroke="${svgExportEscape(vars.border)}" stroke-width="1.2" opacity="${alpha}"/>`
    );
  }

  parts.push('<g id="connections">');
  svgExportPushAllEdgesFromData(parts, p, theme);
  parts.push("</g>");

  for (const n of p.nodes) {
    if (bind().deps.isNodeHiddenCanvas(n) && !pngExportIncludesHiddenNodes()) continue;
    svgExportPushNode(parts, n, theme);
  }
}

export function svgExportResolveCanvasBg(theme, transparent) {
  if (transparent) return null;
  const raw = document.getElementById("canvasBgColor")?.value || theme.workspaceBg;
  return svgExportNormalizeHex(raw) || String(raw || (theme.isLight ? "#e8edf7" : "#0b0f1a")).trim();
}

export function buildDiagramSvgExportString(p, wb, pad, transparent) {
  const theme = getSvgExportTheme();
  const { minX, minY, maxX, maxY } = wb;
  const width = Math.ceil(maxX - minX + pad * 2);
  const height = Math.ceil(maxY - minY + pad * 2);
  const tx = pad - minX;
  const ty = pad - minY;
  const canvasBg = svgExportResolveCanvasBg(theme, transparent);
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  const svgStyle = canvasBg ? ` style="background-color: ${canvasBg};"` : "";
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"${svgStyle}>`
  );
  if (canvasBg) {
    parts.push(
      `<rect id="md-export-canvas-bg" x="0" y="0" width="100%" height="100%" fill="${svgExportEscape(canvasBg)}"/>`
    );
  }
  parts.push(svgExportEmbeddedStyleBlock(theme));
  parts.push("<defs>");
  parts.push(svgExportDefsBlock(theme));
  parts.push("</defs>");
  parts.push(`<g id="diagram" transform="translate(${tx},${ty})">`);
  paintDiagramToSvgParts(parts, p, theme);
  parts.push("</g>");
  if (bind().deps.isFlowchartMode()) {
    parts.push(
      `<text x="${width - 14}" y="${height - 10}" text-anchor="end" font-family="Inter, Segoe UI, Arial" font-size="11" fill="${svgExportEscape(theme.watermark)}">MapDiagram</text>`
    );
  }
  parts.push("</svg>");
  return parts.join("\n");
}

export function exportAsSvg() {
  const p = bind().ctx.getProject();
  if (!p.nodes.length) return;
  bind().deps.renderConnections();
  const padEl = document.getElementById("pngExportPad");
  const basePad = Math.max(8, Math.min(400, Math.round(Number(padEl?.value) || 80)));
  const pad = bind().deps.isFlowchartMode() ? Math.max(basePad, 96) : basePad;
  const transparent = !!document.getElementById("pngExportTransparent")?.checked;
  const wb = getDiagramWorldBoundsForPngExport(p);
  if (!wb) {
    bind().deps.showToast("Nothing to export in the current bounds. Try “Include hidden nodes in PNG” or add visible nodes.", "warn");
    return;
  }
  const svg = buildDiagramSvgExportString(p, wb, pad, transparent);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(p.name || "diagram").replace(/\s+/g, "-").toLowerCase() || "diagram"}.svg`;
  a.click();
  URL.revokeObjectURL(url);
  bind().deps.showToast("SVG export complete (vector nodes, systems, and links).", "info");
}

export function exportAsPng() {
  const p = bind().ctx.getProject();
  if (!p.nodes.length) return;
  const padEl = document.getElementById("pngExportPad");
  const scaleEl = document.getElementById("pngExportScale");
  const basePad = Math.max(8, Math.min(400, Math.round(Number(padEl?.value) || 80)));
  const pad = bind().deps.isFlowchartMode() ? Math.max(basePad, 96) : basePad;
  const sc = Math.max(0.5, Math.min(3, Number(scaleEl?.value) || 1));
  const transparent = !!document.getElementById("pngExportTransparent")?.checked;
  const wb = getDiagramWorldBoundsForPngExport(p);
  if (!wb) {
    bind().deps.showToast("Nothing to export in the current bounds. Try “Include hidden nodes in PNG” or add visible nodes.", "warn");
    return;
  }
  const { minX, minY, maxX, maxY } = wb;
  const width = Math.ceil(maxX - minX + pad * 2);
  const height = Math.ceil(maxY - minY + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * sc));
  canvas.height = Math.max(1, Math.ceil(height * sc));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(sc, sc);
  if (transparent) {
    ctx.clearRect(0, 0, width, height);
  } else {
    const bg = document.getElementById("canvasBgColor")?.value || "#0b0f1a";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }
  const tx = pad - minX;
  const ty = pad - minY;
  ctx.save();
  ctx.translate(tx, ty);
  paintDiagramToPngContext(ctx, p);
  paintPngWatermark(ctx, width, height);
  ctx.restore();
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${(p.name || "diagram").replace(/\s+/g, "-").toLowerCase() || "diagram"}.png`;
  a.click();
  bind().deps.showToast("PNG export complete (nodes, systems, and all link types).", "info");
  if (window.MapDiagramAnalytics) MapDiagramAnalytics.exportPng({ flowchart: bind().deps.isFlowchartMode() });
  if (bind().deps.isFlowchartMode()) {
    window.setTimeout(() => {
      bind().deps.showToast("Shared this flowchart? Publish it online.", "info");
      if (window.MapDiagramAnalytics) MapDiagramAnalytics.shareAfterExport({});
    }, 900);
  }
}

const exportersApi = {
  pngExportIncludesHiddenNodes,
  getDiagramWorldBoundsForPngExport,
  pngCtxSetLineDashFromEdge,
  pngStrokePathD,
  pngDrawArrowAtTip,
  pngDrawEdgeLabel,
  paintDiagramToPngContext,
  paintPngWatermark,
  svgExportEscape,
  svgExportParseHexColor,
  svgExportIsLightFill,
  svgExportNormalizeHex,
  svgExportRawNodeColor,
  svgExportResolveNodePaint,
  getSvgExportTheme,
  svgExportEmbeddedStyleBlock,
  svgExportDefsBlock,
  svgExportResolveConnStroke,
  svgExportPushEdge,
  svgExportPushNodeText,
  svgExportPushNode,
  svgExportPushAllEdgesFromData,
  paintDiagramToSvgParts,
  svgExportResolveCanvasBg,
  buildDiagramSvgExportString,
  exportAsSvg,
  exportAsPng,
};
