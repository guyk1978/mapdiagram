/**
 * Centralized selection state mutations (Phase 6).
 */

export function createSelectionRuntime(ctx, deps) {
  const { runtime, emit } = ctx;

  function isAdditive(ev) {
    return !!(ev && (ev.shiftKey || runtime.stickyMultiSelect));
  }

  function getSelection() {
    return {
      selectedNodeId: runtime.selectedNodeId,
      selectedNodeIds: new Set(runtime.selectedNodeIds),
      selectedGroupId: runtime.selectedGroupId,
      selectedGroupIds: new Set(runtime.selectedGroupIds),
      selectedConnectionId: runtime.selectedConnectionId,
      selectedConnectionIds: new Set(runtime.selectedConnectionIds),
      selectedGroupConnId: runtime.selectedGroupConnId,
      selectedGroupConnIds: new Set(runtime.selectedGroupConnIds),
      selectedFlowGroupId: runtime.selectedFlowGroupId,
      stickyMultiSelect: !!runtime.stickyMultiSelect,
    };
  }

  function notify() {
  if (typeof deps.onSelectionChanged === "function") {
    deps.onSelectionChanged();
  }
}

  function sanitizeSelection() {
    const p = ctx.getProject();
    const nodeIds = new Set(p.nodes.map((n) => n.id));
    const groupIds = new Set((p.userGroups || []).map((g) => g.id));
    const connIds = new Set((p.connections || []).map((c) => c.id));
    const gcIds = new Set((p.groupConnections || []).map((g) => g.id));

    for (const id of [...runtime.selectedNodeIds]) {
      if (!nodeIds.has(id)) runtime.selectedNodeIds.delete(id);
    }
    if (runtime.selectedNodeId && !nodeIds.has(runtime.selectedNodeId)) runtime.selectedNodeId = null;
    if (runtime.selectedNodeIds.size === 1) runtime.selectedNodeId = [...runtime.selectedNodeIds][0];

    for (const id of [...runtime.selectedGroupIds]) {
      if (!groupIds.has(id)) runtime.selectedGroupIds.delete(id);
    }
    if (runtime.selectedGroupId && !groupIds.has(runtime.selectedGroupId)) {
      runtime.selectedGroupId = runtime.selectedGroupIds.size ? [...runtime.selectedGroupIds][0] : null;
    }

    for (const id of [...runtime.selectedConnectionIds]) {
      if (!connIds.has(id)) runtime.selectedConnectionIds.delete(id);
    }
    if (runtime.selectedConnectionId && !connIds.has(runtime.selectedConnectionId)) {
      runtime.selectedConnectionId = null;
    }

    for (const id of [...runtime.selectedGroupConnIds]) {
      if (!gcIds.has(id)) runtime.selectedGroupConnIds.delete(id);
    }
    if (runtime.selectedGroupConnId && !gcIds.has(runtime.selectedGroupConnId)) {
      runtime.selectedGroupConnId = null;
    }

    if (runtime.focusNodeId && !nodeIds.has(runtime.focusNodeId)) runtime.focusNodeId = null;
    deps.syncFocusModalOrphanGuard?.();
    notify();
  }

  function clearSelection(kind) {
    if (!kind || kind === "nodes") {
      runtime.selectedNodeId = null;
      runtime.selectedNodeIds.clear();
    }
    if (!kind || kind === "groups") {
      runtime.selectedGroupId = null;
      runtime.selectedGroupIds.clear();
    }
    if (!kind || kind === "connections") {
      runtime.selectedConnectionId = null;
      runtime.selectedConnectionIds.clear();
    }
    if (!kind || kind === "groupConnections") {
      runtime.selectedGroupConnId = null;
      runtime.selectedGroupConnIds.clear();
    }
    if (!kind || kind === "flowGroups") {
      runtime.selectedFlowGroupId = null;
    }
    notify();
  }

  function toggleNode(nodeId) {
    if (runtime.selectedNodeIds.has(nodeId)) runtime.selectedNodeIds.delete(nodeId);
    else runtime.selectedNodeIds.add(nodeId);
    if (runtime.selectedNodeIds.size === 0) runtime.selectedNodeId = null;
    else if (runtime.selectedNodeIds.size === 1) runtime.selectedNodeId = [...runtime.selectedNodeIds][0];
    else runtime.selectedNodeId = null;
    notify();
  }

  function selectNode(nodeId, opts = {}) {
    if (!opts.additive) {
      runtime.selectedNodeIds.clear();
      runtime.selectedNodeIds.add(nodeId);
      runtime.selectedNodeId = nodeId;
    } else {
      toggleNode(nodeId);
    }
    notify();
  }

  /** Replace node selection with validated ids (marquee and drag paths stay on monolith for now). */
  function selectNodes(nodeIds, opts = {}) {
    const p = ctx.getProject();
    const valid = new Set(p.nodes.map((n) => n.id));
    const next = (Array.isArray(nodeIds) ? nodeIds : []).filter((id) => valid.has(id));
    if (!opts.additive) runtime.selectedNodeIds.clear();
    for (const id of next) runtime.selectedNodeIds.add(id);
    if (runtime.selectedNodeIds.size === 0) runtime.selectedNodeId = null;
    else if (runtime.selectedNodeIds.size === 1) runtime.selectedNodeId = [...runtime.selectedNodeIds][0];
    else runtime.selectedNodeId = opts.keepPrimary && valid.has(opts.keepPrimary) ? opts.keepPrimary : null;
    notify();
  }

  function applyGroupSelection(g, ev, opts = {}) {
    if (isAdditive(ev)) {
      if (runtime.selectedGroupIds.has(g.id)) runtime.selectedGroupIds.delete(g.id);
      else runtime.selectedGroupIds.add(g.id);
      runtime.selectedGroupId = runtime.selectedGroupIds.has(g.id)
        ? g.id
        : [...runtime.selectedGroupIds][0] || null;
    } else {
      runtime.selectedGroupIds.clear();
      runtime.selectedGroupIds.add(g.id);
      runtime.selectedGroupId = g.id;
    }
    runtime.selectedGroupConnId = null;
    runtime.selectedNodeId = null;
    runtime.selectedNodeIds.clear();
    deps.clearConnectionSelectionState?.();
    deps.clearFlowGroupSelection?.();
    if (typeof deps.afterGroupSelection === "function") {
      deps.afterGroupSelection(g, opts);
    }
    notify();
  }

  function syncStickyMultiSelectUi() {
    const on = !!runtime.stickyMultiSelect;
    document.body.classList.toggle("md-sticky-multiselect", on);
    const btn = document.getElementById("stickyMultiSelectBtn");
    if (btn) {
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "Multi-select mode (on) — click to turn off (M)" : "Multi-select mode (M)";
    }
    const mob = document.getElementById("mobileStickyMultiSelectBtn");
    if (mob) {
      mob.classList.toggle("is-active", on);
      mob.setAttribute("aria-pressed", on ? "true" : "false");
      mob.textContent = on ? "Multi-select ON" : "Multi-select";
    }
  }

  function setStickyMultiSelect(on, opts = {}) {
    const next = !!on && !runtime.readOnly;
    runtime.stickyMultiSelect = next;
    syncStickyMultiSelectUi();
    if (opts.toast && next && deps.savedIndicator) {
      deps.savedIndicator.textContent = "Multi-select ON";
      setTimeout(() => {
        if (deps.savedIndicator.textContent === "Multi-select ON") deps.savedIndicator.textContent = "Saved";
      }, 1400);
    }
  }

  function toggleStickyMultiSelect() {
    setStickyMultiSelect(!runtime.stickyMultiSelect, { toast: true });
  }

  function clearAllForUndo() {
    runtime.selectedFlowGroupId = null;
    runtime.selectedNodeId = null;
    runtime.selectedNodeIds.clear();
    runtime.selectedConnectionId = null;
    runtime.selectedConnectionIds.clear();
    runtime.selectedGroupId = null;
    runtime.selectedGroupIds.clear();
    runtime.selectedGroupConnId = null;
    runtime.selectedGroupConnIds.clear();
  }

  return {
    isAdditive,
    getSelection,
    sanitizeSelection,
    clearSelection,
    clearAllForUndo,
    toggleNode,
    selectNode,
    selectNodes,
    applyGroupSelection,
    setStickyMultiSelect,
    toggleStickyMultiSelect,
    syncStickyMultiSelectUi,
  };
}
