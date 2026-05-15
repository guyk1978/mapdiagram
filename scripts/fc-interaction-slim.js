// Lightweight flow-group helpers — no interaction mutex, nodes always win.

function recomputeGroupBounds(groupId) {
  const fg = flowGroupById(getProject(), groupId);
  if (fg) refreshFlowGroupBounds(fg);
  return fg;
}

function syncFlowGroupOverlayFrame(fgId) {
  const fg = recomputeGroupBounds(fgId);
  if (!fg || !canvasUnderlays) return;
  const frame = canvasUnderlays.querySelector(`[data-flow-group-id="${fgId}"]`);
  if (!frame) return;
  frame.style.left = `${fg.x}px`;
  frame.style.top = `${fg.y}px`;
  frame.style.width = `${fg.width}px`;
  frame.style.height = `${fg.height}px`;
}

function clearPendingConnectionState() {
  runtime.connecting = null;
  runtime.previewFrom = null;
  if (runtime.previewPath) {
    runtime.previewPath.remove();
    runtime.previewPath = null;
  }
  workspace.style.cursor = "";
}

function clearFcInteractionState(opts = {}) {
  if (runtime.flowGroupDragging) {
    const gd = runtime.flowGroupDragging;
    canvasUnderlays?.querySelector(`[data-flow-group-id="${gd.fgId}"]`)?.classList.remove("is-dragging");
    runtime.flowGroupDragging = null;
  }
  if (runtime.groupDragging) abortGroupDrag();
  releaseStoredNodeBodyPointerCapture();
  if (runtime.dragging) {
    const ids = runtime.dragging.dragIds || [runtime.dragging.nodeId];
    setFlowchartNodesDragging(ids, false);
  }
  runtime.dragging = null;
  runtime.panning = null;
  clearPendingConnectionState();
  if (runtime.groupPreviewPath) {
    runtime.groupPreviewPath.remove();
    runtime.groupPreviewPath = null;
  }
  runtime.groupConnecting = null;
  runtime.cpDragging = null;
  runtime.pinch = null;
  runtime.bodyPressPointerId = null;
  runtime.bodyPressStart = null;
  runtime.bodyPressNodeId = null;
  if (runtime.bodyConnectPressTimer) {
    clearTimeout(runtime.bodyConnectPressTimer);
    runtime.bodyConnectPressTimer = null;
  }
  workspace.classList.remove("panning");
  workspace.style.cursor = "";
  runtime.fcCanvasPick = null;
  if (runtime.marquee) {
    runtime.marquee = null;
    if (marquee) marquee.style.display = "none";
  }
}

function scheduleRenderConnections() {
  if (runtime.renderConnectionsRaf) cancelAnimationFrame(runtime.renderConnectionsRaf);
  runtime.renderConnectionsRaf = requestAnimationFrame(() => {
    runtime.renderConnectionsRaf = null;
    renderConnections();
    renderSelection();
  });
}

function startFlowGroupDrag(fg, frame, e) {
  if (e.button !== 0) return;
  e.stopPropagation();
  pushHistory();
  const starts = {};
  for (const id of fg.nodeIds || []) {
    const n = getNodeById(id);
    if (!n) continue;
    const w = getNodeWorldPosition(n);
    starts[id] = { wx: w.x, wy: w.y };
  }
  runtime.flowGroupDragging = {
    fgId: fg.id,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    starts,
    nodeIds: [...(fg.nodeIds || [])],
  };
  frame?.classList.add("is-dragging");
}

function updateFlowGroupDrag(e) {
  const gd = runtime.flowGroupDragging;
  if (!gd || (gd.pointerId != null && gd.pointerId !== e.pointerId)) return;
  const p = getProject();
  const dx = (e.clientX - gd.startX) / p.view.zoom;
  const dy = (e.clientY - gd.startY) / p.view.zoom;
  for (const id of gd.nodeIds || []) {
    const start = gd.starts?.[id];
    const dn = getNodeById(id);
    if (!dn || !start) continue;
    setNodeWorldPosition(dn, start.wx + dx, start.wy + dy);
    const el = nodesLayer.querySelector(`[data-node-id="${id}"]`);
    if (el) {
      const wpos = getNodeWorldPosition(dn);
      el.style.left = `${wpos.x}px`;
      el.style.top = `${wpos.y}px`;
    }
  }
  syncFlowGroupOverlayFrame(gd.fgId);
  scheduleRenderConnections();
}

function finalizeFlowGroupDragIfAny() {
  const gd = runtime.flowGroupDragging;
  if (!gd) return;
  canvasUnderlays?.querySelector(`[data-flow-group-id="${gd.fgId}"]`)?.classList.remove("is-dragging");
  recomputeGroupBounds(gd.fgId);
  runtime.flowGroupDragging = null;
  renderFlowGroupOverlays();
  scheduleRenderConnections();
  markDirty();
}

function stripFlowGroupBridgeConnections(p) {
  p.connections = (p.connections || []).filter(
    (c) =>
      !(
        c &&
        (c.kind === "node-flowgroup" || c.kind === "flowgroup-node" || c.kind === "flowgroup-flowgroup")
      )
  );
}
