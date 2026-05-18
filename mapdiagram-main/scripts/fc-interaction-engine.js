// Flowchart interaction engine — inserted into app/tool.html
// Single-owner pointer model, derived group bounds, batched renders, unified hit-test.

window.FC_DEBUG_INTERACTION = window.FC_DEBUG_INTERACTION === true;

function fcLogInteraction(event, detail) {
  if (!window.FC_DEBUG_INTERACTION) return;
  const mode = runtime.interaction?.mode ?? "?";
  console.log(`[FC interaction] ${event} mode=${mode}`, detail ?? "");
}

function fcInteractionIsIdle() {
  return !runtime.interaction || runtime.interaction.mode === "idle";
}

function fcCanStartInteraction(mode) {
  return fcInteractionIsIdle();
}

function fcBeginInteraction(mode, opts = {}) {
  if (!fcCanStartInteraction(mode)) {
    fcLogInteraction("blocked", { want: mode, current: runtime.interaction?.mode });
    return false;
  }
  runtime.interaction = {
    mode,
    targetId: opts.targetId ?? null,
    pointerId: opts.pointerId ?? null,
    startedAt: Date.now(),
    meta: opts.meta ?? null,
  };
  fcLogInteraction("begin", { mode, targetId: opts.targetId });
  return true;
}

function fcEndInteraction(expectedMode) {
  if (expectedMode && runtime.interaction?.mode !== expectedMode) return;
  fcLogInteraction("end", { mode: runtime.interaction?.mode });
  runtime.interaction = { mode: "idle", targetId: null, pointerId: null, startedAt: null, meta: null };
}

function fcGetInteractionMode() {
  return runtime.interaction?.mode ?? "idle";
}

function fcPointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

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

function getEntityAnchor(entityRef, sideHint = "out", toward = null) {
  if (!entityRef) return { x: 0, y: 0 };
  let type = entityRef.type;
  let id = entityRef.id;
  if (typeof entityRef === "string") {
    type = "node";
    id = entityRef;
  }
  if (type === "node") {
    const n = getNodeById(id);
    if (!n) return { x: 0, y: 0 };
    const role = sideHint === "in" ? "to" : "from";
    const tw = toward && Number.isFinite(toward.x) ? toward : nodeWorldCenter(n);
    return anchorNodeForConnection(id, role, tw);
  }
  if (type === "flowgroup") {
    const box = getFlowGroupBox(id);
    if (!box) return { x: 0, y: 0 };
    return groupAnchor(box, sideHint === "in" ? "in" : "out", toward);
  }
  if (type === "usergroup") {
    const box = getUserGroupBox(id);
    if (!box) return { x: 0, y: 0 };
    return groupAnchor(box, sideHint === "in" ? "in" : "out", toward);
  }
  fcLogInteraction("stale-anchor", entityRef);
  return { x: 0, y: 0 };
}

function getTopmostEntityAtPoint(wx, wy, opts = {}) {
  const p = getProject();
  const sourceNodeId = opts.sourceNodeId || null;
  const sourceFlowGroupId = opts.sourceFlowGroupId || null;
  const edge = 8;

  for (let i = p.nodes.length - 1; i >= 0; i--) {
    const n = p.nodes[i];
    if (n.id === sourceNodeId) continue;
    if (isNodeHiddenCanvas(n)) continue;
    const pos = getNodeWorldPosition(n);
    const nw = Number(n.width) || 120;
    const nh = Number(n.height) || 72;
    if (fcPointInRect(wx, wy, pos.x, pos.y, nw, nh)) {
      return { kind: "node", id: n.id };
    }
  }

  if (isFlowchartMode() && (p.flowGroups || []).length) {
    const groups = [...p.flowGroups].reverse();
    for (const fg of groups) {
      if (fg.id === sourceFlowGroupId || fg.collapsed) continue;
      refreshFlowGroupBounds(fg);
      const headerH = FC_FLOW_GROUP_PAD.header;
      if (fcPointInRect(wx, wy, fg.x, fg.y, fg.width, headerH)) {
        return { kind: "flowgroup-header", id: fg.id };
      }
      const bx = fg.x;
      const by = fg.y;
      const bw = fg.width;
      const bh = fg.height;
      const onBorder =
        fcPointInRect(wx, wy, bx, by, bw, edge) ||
        fcPointInRect(wx, wy, bx, by + bh - edge, bw, edge) ||
        fcPointInRect(wx, wy, bx, by, edge, bh) ||
        fcPointInRect(wx, wy, bx + bw - edge, by, edge, bh);
      if (onBorder && !fcPointInRect(wx, wy, bx + edge, by + headerH, bw - edge * 2, bh - headerH - edge)) {
        return { kind: "flowgroup-border", id: fg.id };
      }
    }
  }

  return { kind: "canvas" };
}

function getTopmostEntityFromEvent(event, opts = {}) {
  const pt = world(event.clientX, event.clientY);
  const dom = event.target;
  if (dom?.closest?.(".cp-handle")) return { kind: "cp-handle", el: dom.closest(".cp-handle") };
  if (dom?.closest?.(".fc-flow-group-handle")) {
    const fg = dom.closest(".fc-flow-group");
    const side = dom.classList.contains("in") ? "in" : "out";
    return { kind: "flowgroup-handle", id: fg?.dataset?.flowGroupId, side };
  }
  if (dom?.closest?.(".group-handle")) {
    const g = dom.closest(".group-chrome");
    return { kind: "usergroup-handle", id: g?.dataset?.groupId, side: dom.classList.contains("in") ? "in" : "out" };
  }
  if (dom?.closest?.(".conn-hit")) return { kind: "connection", el: dom.closest(".conn-hit") };
  const model = getTopmostEntityAtPoint(pt.x, pt.y, opts);
  if (model.kind !== "canvas") return model;
  if (dom?.closest?.(".node")) {
    const id = dom.closest(".node")?.dataset?.nodeId;
    if (id && id !== opts.sourceNodeId) return { kind: "node", id };
  }
  return model;
}

function clearPendingConnectionState() {
  runtime.connecting = null;
  runtime.previewFrom = null;
  if (runtime.previewPath) {
    runtime.previewPath.remove();
    runtime.previewPath = null;
  }
  workspace.style.cursor = "";
  if (runtime.interaction?.mode === "connect") fcEndInteraction("connect");
}

function clearFcInteractionState(opts = {}) {
  const preserveSelection = !!opts.preserveSelection;
  if (runtime.interaction?.mode === "drag-group") {
    const meta = runtime.interaction.meta;
    const frame = meta?.fgId
      ? canvasUnderlays?.querySelector(`[data-flow-group-id="${meta.fgId}"]`)
      : null;
    frame?.classList.remove("is-dragging");
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
  fcEndInteraction();
  if (!preserveSelection) {
    /* selection preserved by caller */
  }
}

function requestRender(flags = {}) {
  if (!runtime.renderQueue) {
    runtime.renderQueue = { nodes: false, groups: false, connections: false, selection: false };
  }
  if (flags.nodes) runtime.renderQueue.nodes = true;
  if (flags.groups) runtime.renderQueue.groups = true;
  if (flags.connections) runtime.renderQueue.connections = true;
  if (flags.selection) runtime.renderQueue.selection = true;
  if (runtime.renderScheduleRaf) return;
  runtime.renderScheduleRaf = requestAnimationFrame(() => {
    runtime.renderScheduleRaf = null;
    const q = runtime.renderQueue || {};
    runtime.renderQueue = { nodes: false, groups: false, connections: false, selection: false };
    if (q.groups) renderFlowGroupOverlays();
    if (q.nodes) renderNodes();
    if (q.connections) renderConnections();
    if (q.selection || q.connections) renderSelection();
  });
}

function scheduleRenderConnections() {
  requestRender({ connections: true, selection: true });
}

function getFlowGroupDragMeta() {
  return runtime.interaction?.mode === "drag-group" ? runtime.interaction.meta : null;
}

function startFlowGroupDrag(fg, frame, e) {
  if (!fcBeginInteraction("drag-group", {
    targetId: fg.id,
    pointerId: e.pointerId,
    meta: {
      fgId: fg.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      starts: Object.fromEntries(
        (fg.nodeIds || [])
          .map((id) => {
            const n = getNodeById(id);
            if (!n) return null;
            const w = getNodeWorldPosition(n);
            return [id, { wx: w.x, wy: w.y }];
          })
          .filter(Boolean)
      ),
      nodeIds: [...(fg.nodeIds || [])],
    },
  })) {
    return false;
  }
  pushHistory();
  frame?.classList.add("is-dragging");
  selectFlowGroup(fg.id);
  return true;
}

function updateFlowGroupDrag(e) {
  const meta = getFlowGroupDragMeta();
  if (!meta || (meta.pointerId != null && meta.pointerId !== e.pointerId)) return;
  const p = getProject();
  const dx = (e.clientX - meta.startX) / p.view.zoom;
  const dy = (e.clientY - meta.startY) / p.view.zoom;
  for (const id of meta.nodeIds || []) {
    const start = meta.starts?.[id];
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
  syncFlowGroupOverlayFrame(meta.fgId);
  requestRender({ connections: true });
}

function finalizeFlowGroupDragIfAny() {
  const meta = getFlowGroupDragMeta();
  if (!meta) return;
  const frame = canvasUnderlays?.querySelector(`[data-flow-group-id="${meta.fgId}"]`);
  frame?.classList.remove("is-dragging");
  recomputeGroupBounds(meta.fgId);
  fcEndInteraction("drag-group");
  requestRender({ groups: true, connections: true });
  markDirty();
}

function resolveConnectHoverPoint(e, connecting) {
  const rawPoint = world(e.clientX, e.clientY);
  const hit = getTopmostEntityFromEvent(e, {
    sourceNodeId: connecting.fromNodeId || null,
    sourceFlowGroupId: connecting.fromFlowGroupId || null,
  });

  let hoverNodeId = null;
  let hoverFlowGroupId = null;
  let hoverGroupInId = null;

  const srcFg = connecting.fromFlowGroupId || null;
  if (hit.kind === "node") hoverNodeId = hit.id;
  else if (hit.kind === "flowgroup-handle" && hit.side === "in" && hit.id !== srcFg) hoverFlowGroupId = hit.id;
  else if ((hit.kind === "flowgroup-header" || hit.kind === "flowgroup-border") && hit.id !== srcFg) {
    hoverFlowGroupId = hit.id;
  } else if (hit.kind === "usergroup-handle" && hit.side === "in") hoverGroupInId = hit.id;
  else if (srcFg && !connecting.fromNodeId) {
    const model = getTopmostEntityAtPoint(rawPoint.x, rawPoint.y, { sourceFlowGroupId: srcFg });
    if (model.kind === "node") hoverNodeId = model.id;
    else if (model.kind === "flowgroup-header" || model.kind === "flowgroup-border") hoverFlowGroupId = model.id;
    else hoverNodeId = getSnapTargetByPoint(rawPoint, null);
  } else if (!connecting.fromNodeId) {
    hoverNodeId = getSnapTargetByPoint(rawPoint, null);
  } else {
    const model = getTopmostEntityAtPoint(rawPoint.x, rawPoint.y, { sourceNodeId: connecting.fromNodeId });
    if (model.kind === "node") hoverNodeId = model.id;
    else if (model.kind === "flowgroup-header" || model.kind === "flowgroup-border") hoverFlowGroupId = model.id;
    else hoverNodeId = getSnapTargetByPoint(rawPoint, connecting.fromNodeId);
  }
  if (hoverFlowGroupId === srcFg) hoverFlowGroupId = null;

  connecting.hoverNodeId = hoverNodeId;
  connecting.hoverFlowGroupId = hoverFlowGroupId;
  connecting.hoverGroupInId = hoverGroupInId;
  connecting.hoverFlowGroupInId = hoverFlowGroupId;

  let point = rawPoint;
  if (hoverNodeId && runtime.previewFrom) {
    point = getEntityAnchor({ type: "node", id: hoverNodeId }, "in", runtime.previewFrom);
  } else if (hoverFlowGroupId && runtime.previewFrom) {
    point = getEntityAnchor({ type: "flowgroup", id: hoverFlowGroupId }, "in", runtime.previewFrom);
  } else if (hoverGroupInId && runtime.previewFrom) {
    point = getEntityAnchor({ type: "usergroup", id: hoverGroupInId }, "in", runtime.previewFrom);
  }
  return { point, hoverNodeId, hoverFlowGroupId, hoverGroupInId, valid: !!(hoverNodeId || hoverFlowGroupId || hoverGroupInId) };
}
