  function selectFlowGroup(fgId) {
    runtime.selectedFlowGroupId = fgId || null;
    runtime.selectedNodeId = null;
    runtime.selectedNodeIds.clear();
    runtime.selectedGroupId = null;
    runtime.selectedGroupIds.clear();
    clearAllEdgeSelection();
    renderSelection();
  }

  function clearFlowGroupSelection() {
    runtime.selectedFlowGroupId = null;
  }

  function bindFlowGroupFrameEvents(frame, fg) {
    if (frame.dataset.fcFgBound) return;
    frame.dataset.fcFgBound = "1";
    const header = frame.querySelector(".fc-flow-group-header");
    const label = frame.querySelector(".fc-flow-group-label");
    const startDrag = (e) => {
      if (e.button !== 0 || label?.isContentEditable) return;
      if (e.target.closest(".fc-flow-group-handle")) return;
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
      frame.classList.add("is-dragging");
      selectFlowGroup(fg.id);
    };
    header?.addEventListener("pointerdown", startDrag);
    frame.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".fc-flow-group-handle")) return;
      if (e.target === frame) startDrag(e);
    });
    label?.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      fcStartFlowGroupTitleEdit(fg.id);
    });
    frame.querySelectorAll(".fc-flow-group-handle").forEach((h) => {
      h.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        startFlowGroupConnectionDrag(fg.id, h.classList.contains("out") ? "out" : "in", e);
      });
    });
  }

  function renderFlowGroupOverlays() {
    if (!canvasUnderlays) return;
    let layer = canvasUnderlays.querySelector(".fc-flow-groups-layer");
    if (!fcEditorCanSelect()) {
      if (layer) layer.remove();
      return;
    }
    const p = getProject();
    ensureFlowGroups(p);
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "fc-flow-groups-layer";
      canvasUnderlays.appendChild(layer);
    }
    layer.replaceChildren();
    for (const fg of p.flowGroups) {
      if (fg.collapsed || !fg.nodeIds?.length) continue;
      refreshFlowGroupBounds(fg);
      const frame = document.createElement("div");
      frame.className = "fc-flow-group" + (runtime.selectedFlowGroupId === fg.id ? " selected" : "");
      frame.dataset.flowGroupId = fg.id;
      frame.style.left = `${fg.x}px`;
      frame.style.top = `${fg.y}px`;
      frame.style.width = `${fg.width}px`;
      frame.style.height = `${fg.height}px`;
      if (fg.color) {
        frame.style.borderColor = hexToRgba(fg.color, 0.32);
        frame.style.background = hexToRgba(fg.color, 0.06);
      }
      const header = document.createElement("div");
      header.className = "fc-flow-group-header";
      const label = document.createElement("span");
      label.className = "fc-flow-group-label";
      label.textContent = fg.title || "Group";
      header.appendChild(label);
      const outH = document.createElement("div");
      outH.className = "fc-flow-group-handle out";
      outH.title = "Connect from group";
      const inH = document.createElement("div");
      inH.className = "fc-flow-group-handle in";
      inH.title = "Connect to group";
      frame.append(header, outH, inH);
      bindFlowGroupFrameEvents(frame, fg);
      layer.appendChild(frame);
    }
  }
