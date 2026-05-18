
  function fcStartFlowGroupTitleEdit(fgId) {
    const fg = flowGroupById(getProject(), fgId);
    if (!fg) return;
    const frame = canvasUnderlays?.querySelector(`[data-flow-group-id="${fgId}"]`);
    const label = frame?.querySelector(".fc-flow-group-label");
    if (!label || label.isContentEditable) return;
    const orig = fg.title || "Group";
    label.classList.add("fc-editing");
    label.contentEditable = "true";
    label.focus();
    const range = document.createRange();
    range.selectNodeContents(label);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const finish = (save) => {
      label.contentEditable = "false";
      label.classList.remove("fc-editing");
      const next = save ? (label.textContent || "").trim() || "Group" : orig;
      fg.title = next;
      label.textContent = next;
      markDirty();
      renderFlowGroupOverlays();
      syncFcGroupQuickEditToolbar();
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        label.textContent = orig;
        label.blur();
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        label.blur();
      }
    };
    label.addEventListener("keydown", onKey);
    label.addEventListener("blur", () => {
      label.removeEventListener("keydown", onKey);
      finish(label.textContent.trim() !== orig);
    }, { once: true });
  }

  function getFlowGroupBoxForAnchor(fgId) {
    const box = getFlowGroupBox(fgId);
    if (!box) return null;
    return { x: box.x, y: box.y, w: box.w, h: box.h };
  }

  function startFlowGroupConnectionDrag(fgId, side, pointerEvent) {
    const box = getFlowGroupBoxForAnchor(fgId);
    if (!box) return;
    const center = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const from = groupAnchor(box, side === "out" ? "out" : "in", center);
    runtime.connecting = {
      fromFlowGroupId: fgId,
      fromSide: side,
      hoverNodeId: null,
      hoverFlowGroupId: null,
    };
    runtime.previewFrom = from;
    runtime.previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    runtime.previewPath.setAttribute("class", "conn");
    runtime.previewPath.setAttribute("stroke-dasharray", "6 4");
    runtime.previewPath.classList.add("preview-neutral");
    connectionsLayer.appendChild(runtime.previewPath);
    if (pointerEvent?.pointerId != null && pointerEvent.target?.setPointerCapture) {
      pointerEvent.target.setPointerCapture(pointerEvent.pointerId);
    }
    workspace.style.cursor = "crosshair";
    selectFlowGroup(fgId);
  }

  function findFlowGroupTargetFromEvent(event, sourceFgId) {
    const el = event.target.closest(".fc-flow-group");
    const id = el?.dataset?.flowGroupId;
    if (!id || id === sourceFgId) return null;
    return flowGroupById(getProject(), id) ? id : null;
  }

  function isFlowGroupBridgeConnection(c) {
    return !!(c && (c.kind === "node-flowgroup" || c.kind === "flowgroup-node" || c.kind === "flowgroup-flowgroup"));
  }

  function duplicateFlowGroupAction(fgId) {
    const fg = flowGroupById(getProject(), fgId);
    if (!fg || !(fg.nodeIds || []).length) return;
    pushHistory();
    const p = getProject();
    const ox = 36;
    const oy = 36;
    const idMap = new Map();
    for (const nid of fg.nodeIds) {
      const n = getNodeById(nid);
      if (!n || !nodeCanWorkspaceTransform(n)) continue;
      const clone = normalizeNode(deepCopy(n));
      clone.id = uid();
      const w = getNodeWorldPosition(n);
      setNodeWorldPosition(clone, w.x + ox, w.y + oy);
      p.nodes.push(clone);
      idMap.set(nid, clone.id);
    }
    const newConns = [];
    for (const c of p.connections) {
      if (!isNodeNodeConnection(c)) continue;
      if (idMap.has(c.from) && idMap.has(c.to)) {
        const nc = deepCopy(c);
        nc.id = uid();
        nc.from = idMap.get(c.from);
        nc.to = idMap.get(c.to);
        newConns.push(nc);
      }
    }
    for (const nc of newConns) p.connections.push(nc);
    const newIds = [...idMap.values()];
    const b = computeFlowGroupBounds(newIds);
    const ng = {
      id: uid(),
      title: `${fg.title || "Group"} copy`,
      nodeIds: newIds,
      color: fg.color || "#7aa2ff",
      collapsed: false,
      x: b?.x ?? fg.x + ox,
      y: b?.y ?? fg.y + oy,
      width: b?.width ?? fg.width,
      height: b?.height ?? fg.height,
    };
    p.flowGroups.push(ng);
    runtime.selectedFlowGroupId = ng.id;
    runtime.selectedNodeIds.clear();
    runtime.selectedNodeId = null;
    renderAll();
    markDirty();
    scheduleSemanticAnalysis();
    showToast("Group duplicated.", "info");
  }

  function deleteFlowGroupOnly(fgId) {
    const p = getProject();
    p.flowGroups = (p.flowGroups || []).filter((g) => g.id !== fgId);
    p.connections = (p.connections || []).filter((c) => {
      if (c.kind === "node-flowgroup" && c.toFlowGroupId === fgId) return false;
      if (c.kind === "flowgroup-node" && c.fromFlowGroupId === fgId) return false;
      if (c.kind === "flowgroup-flowgroup" && (c.fromFlowGroupId === fgId || c.toFlowGroupId === fgId)) return false;
      return true;
    });
    if (runtime.selectedFlowGroupId === fgId) runtime.selectedFlowGroupId = null;
  }

  function requestDeleteFlowGroup(fgId) {
    const fg = flowGroupById(getProject(), fgId);
    if (!fg) return;
    const delContents = confirm(
      `Delete group "${fg.title}" and all ${fg.nodeIds.length} steps inside?\n\nPress OK to delete everything.\nPress Cancel to remove only the group frame (steps stay).`
    );
    pushHistory();
    if (delContents) {
      runtime.selectedNodeIds = new Set(fg.nodeIds);
      runtime.selectedNodeId = fg.nodeIds[0] || null;
      deleteSelectedNodesAction();
    } else {
      deleteFlowGroupOnly(fgId);
      renderFlowGroupOverlays();
      renderConnections();
      renderSelection();
      markDirty();
      showToast("Group removed — steps kept.", "info");
    }
  }

  function fcAddConnectedFromFlowGroup(fgId) {
    const fg = flowGroupById(getProject(), fgId);
    if (!fg || !fg.nodeIds?.length) return;
    const fromId = fg.nodeIds[fg.nodeIds.length - 1];
    runtime.selectedNodeIds.clear();
    runtime.selectedNodeIds.add(fromId);
    runtime.selectedNodeId = fromId;
    runtime.selectedFlowGroupId = null;
    fcAddConnectedNodeFromSelection(fromId);
  }

  function syncFcGroupQuickEditToolbar() {
    const bar = document.getElementById("fcGroupQuickEdit");
    if (!bar || !fcEditorCanSelect()) {
      if (bar) {
        bar.hidden = true;
        bar.classList.remove("is-visible");
      }
      return;
    }
    const fgId = runtime.selectedFlowGroupId;
    const fg = fgId ? flowGroupById(getProject(), fgId) : null;
    if (!fg || getFlowchartMultiSelectCount() > 0 || runtime.editingNodeId) {
      bar.hidden = true;
      bar.classList.remove("is-visible");
      return;
    }
    refreshFlowGroupBounds(fg);
    bar.hidden = false;
    const wsR = workspace.getBoundingClientRect();
    const p = getProject();
    const cx = (fg.x + fg.width / 2) * p.view.zoom + p.view.x;
    const top = fg.y * p.view.zoom + p.view.y - 48;
    const barW = bar.offsetWidth || 320;
    bar.style.left = `${Math.max(8, Math.min(wsR.width - barW - 8, cx - barW / 2))}px`;
    bar.style.top = `${Math.max(8, top)}px`;
    bar.classList.add("is-visible");
  }

  function bindFcGroupQuickEditToolbar() {
    const bar = document.getElementById("fcGroupQuickEdit");
    if (!bar || bar.dataset.fcGroupQb) return;
    bar.dataset.fcGroupQb = "1";
    const shield = (e) => {
      runtime.fcToolbarInteracting = true;
      e.stopPropagation();
    };
    bar.addEventListener("pointerdown", shield, true);
    const run = (e, fn) => {
      if (runtime.readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      runtime.fcToolbarInteracting = true;
      const id = runtime.selectedFlowGroupId;
      fn(id);
      window.setTimeout(() => {
        runtime.fcToolbarInteracting = false;
        syncFcGroupQuickEditToolbar();
      }, 0);
    };
    document.getElementById("fcGroupRenameBtn")?.addEventListener("click", (e) => run(e, (id) => fcStartFlowGroupTitleEdit(id)));
    document.getElementById("fcGroupDupBtn")?.addEventListener("click", (e) => run(e, (id) => duplicateFlowGroupAction(id)));
    document.getElementById("fcGroupConnectBtn")?.addEventListener("click", (e) => run(e, (id) => fcAddConnectedFromFlowGroup(id)));
    document.getElementById("fcGroupDeleteBtn")?.addEventListener("click", (e) => run(e, (id) => requestDeleteFlowGroup(id)));
  }

  function refreshCanvasView() {
    if (!isFlowchartMode()) return;
    const btn = document.getElementById("refreshCanvasBtn");
    btn?.classList.add("is-refreshing");
    recomputeAllFlowGroupBounds();
    renderFlowGroupOverlays();
    renderConnections();
    syncNodeSizes();
    renderNodes();
    renderSelection();
    renderNodeSemanticClasses();
    renderSemanticOverlays();
    scheduleSemanticAnalysis(400);
    window.setTimeout(() => btn?.classList.remove("is-refreshing"), 550);
    showToast("Canvas refreshed.", "info");
  }

  function finalizeFlowGroupDragIfAny() {
    const gd = runtime.flowGroupDragging;
    if (!gd) return;
    const frame = canvasUnderlays?.querySelector(`[data-flow-group-id="${gd.fgId}"]`);
    frame?.classList.remove("is-dragging");
    refreshFlowGroupBounds(flowGroupById(getProject(), gd.fgId));
    runtime.flowGroupDragging = null;
    renderFlowGroupOverlays();
    markDirty();
    scheduleRenderConnections();
  }
