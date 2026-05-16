/**
 * User group duplication and bounds cache (Phase 6).
 */

export function createGroupRuntime(ctx, deps) {
  const { runtime } = ctx;
  const MD_GROUP_DUP_OFFSET = deps.groupDupOffset ?? 40;

  function invalidateGroupBoxCache() {
    runtime.groupBoxCache = null;
  }

  function getUserGroupBox(groupId) {
    const p = ctx.getProject();
    if (!groupId) return null;
    if (!runtime.groupBoxCache) runtime.groupBoxCache = new Map();
    if (runtime.groupBoxCacheProjectId !== p.projectId) {
      runtime.groupBoxCache.clear();
      runtime.groupBoxCacheProjectId = p.projectId;
    }
    if (runtime.groupBoxCache.has(groupId)) return runtime.groupBoxCache.get(groupId);
    const box = deps.computeUserGroupBox(groupId);
    runtime.groupBoxCache.set(groupId, box);
    return box;
  }

  function duplicateUserGroup(rootId) {
    const p = ctx.getProject();
    deps.ensureProjectExtras?.(p);
    const root = deps.userGroupById?.(p, rootId);
    if (!root) return null;

    const OFF = MD_GROUP_DUP_OFFSET;
    const subtree = deps.getSubtreeGroupIdsSet?.(p, rootId);
    const sortedOld = [...subtree]
      .map((id) => deps.userGroupById(p, id))
      .filter(Boolean)
      .sort((a, b) => (a.hierarchyDepth || 0) - (b.hierarchyDepth || 0));
    const gidMap = {};
    const newGroups = [];
    if (deps.pushHistoryOnDuplicate !== false) deps.pushHistory?.();

    for (const g of sortedOld) {
      const ngid = deps.uid();
      gidMap[g.id] = ngid;
      const ng = deps.normalizeGroup({
        id: ngid,
        name: `${g.name || "Group"} (copy)`,
        color: g.color || "#8baeff",
        nodeIds: [],
        childGroupIds: [],
        parentGroupId:
          g.parentGroupId && subtree.has(g.parentGroupId) ? gidMap[g.parentGroupId] : g.parentGroupId,
        collapsed: false,
        collapseFrame: null,
        expandedFrame: null,
        groupMeta: deps.deepCopy(g.groupMeta || {}),
        locked: !!g.locked,
        pinned: !!g.pinned,
        zIndex: g.zIndex || 0,
        x: (Number(g.x) || 0) + (p._groupLocalSpace === 2 ? OFF : 0),
        y: (Number(g.y) || 0) + (p._groupLocalSpace === 2 ? OFF : 0),
      });
      newGroups.push({ old: g, ng });
    }

    for (const { old, ng } of newGroups) {
      ng.childGroupIds = (old.childGroupIds || [])
        .filter((cid) => subtree.has(cid))
        .map((cid) => gidMap[cid]);
    }

    const nodeMap = {};
    const allOldNodes = new Set();
    for (const gid of subtree) {
      for (const nid of deps.getAllNodeIdsInGroupSubtree(p, gid)) allOldNodes.add(nid);
    }

    for (const nid of allOldNodes) {
      const n = deps.getNodeById(nid);
      if (!n) continue;
      const nn = deps.deepCopy(n);
      nn.id = deps.uid();
      if (p._groupLocalSpace === 2) {
        nn.x = n.x;
        nn.y = n.y;
      } else {
        nn.x = (n.x || 0) + OFF;
        nn.y = (n.y || 0) + OFF;
      }
      deps.normalizeNode?.(nn);
      nodeMap[nid] = nn;
      p.nodes.push(nn);
    }

    for (const { old, ng } of newGroups) {
      ng.nodeIds = (old.nodeIds || []).map((oid) => nodeMap[oid]?.id).filter(Boolean);
    }
    for (const { ng } of newGroups) p.userGroups.push(ng);

    const oldNodeSet = allOldNodes;
    const snapConn = [...p.connections];
    const connIdMap = {};

    for (const c of snapConn) {
      if (deps.isNodeNodeConnection(c) && oldNodeSet.has(c.from) && oldNodeSet.has(c.to)) {
        const nc = deps.deepCopy(c);
        nc.id = deps.uid();
        nc.from = nodeMap[c.from].id;
        nc.to = nodeMap[c.to].id;
        connIdMap[c.id] = nc.id;
        p.connections.push(nc);
      } else if (c.kind === "node-group" && oldNodeSet.has(c.from) && subtree.has(c.toGroupId)) {
        const nc = deps.deepCopy(c);
        nc.id = deps.uid();
        nc.from = nodeMap[c.from].id;
        nc.toGroupId = gidMap[c.toGroupId];
        p.connections.push(nc);
      } else if (c.kind === "group-node" && oldNodeSet.has(c.to) && subtree.has(c.fromGroupId)) {
        const nc = deps.deepCopy(c);
        nc.id = deps.uid();
        nc.to = nodeMap[c.to].id;
        nc.fromGroupId = gidMap[c.fromGroupId];
        p.connections.push(nc);
      }
    }

    const snapGc = [...(p.groupConnections || [])];
    for (const gc of snapGc) {
      if (subtree.has(gc.fromGroupId) && subtree.has(gc.toGroupId)) {
        const ngc = deps.deepCopy(gc);
        ngc.id = deps.uid();
        ngc.fromGroupId = gidMap[gc.fromGroupId];
        ngc.toGroupId = gidMap[gc.toGroupId];
        p.groupConnections.push(ngc);
      }
    }

    for (const c of snapConn) {
      if (!deps.isBranchFromConnection(c)) continue;
      if (!oldNodeSet.has(c.to)) continue;
      const mappedParent = connIdMap[c.parentConnectionId];
      const nnTo = nodeMap[c.to];
      if (!mappedParent || !nnTo) continue;
      const nc = deps.deepCopy(c);
      nc.id = deps.uid();
      nc.parentConnectionId = mappedParent;
      nc.to = nnTo.id;
      deps.normalizeConnectionEdge?.(nc);
      p.connections.push(nc);
    }

    deps.reindexUserGroupHierarchy?.(p);
    deps.dedupeUserGroupMembership?.(p);
    const alive = new Set(p.userGroups.map((g) => g.id));
    p.groupConnections = (p.groupConnections || []).filter(
      (c) => alive.has(c.fromGroupId) && alive.has(c.toGroupId)
    );

    const newRootId = gidMap[rootId];
    deps.selectionRuntime?.clearSelection?.();
    runtime.selectedGroupIds.clear();
    runtime.selectedGroupIds.add(newRootId);
    runtime.selectedGroupId = newRootId;

    const newGroupIds = newGroups.map(({ ng }) => ng.id);
    deps.syncStoredGroupBoundsForGroupIds?.(p, newGroupIds);

    for (const k of Object.keys(runtime.connectionUi)) {
      if (!p.connections.some((c) => c.id === k)) delete runtime.connectionUi[k];
    }

    deps.renderRuntime?.invalidateInteractionCaches?.({ clearNodeEl: true, clearGraph: true });
    deps.scheduleFullRender?.();
    deps.sanitizeSelection?.();
    deps.assertProjectIntegrity?.("duplicateUserGroup");
    ctx.markDirty();
    deps.scheduleSemanticAnalysis?.();
    return newRootId;
  }

  return {
    getUserGroupBox,
    invalidateGroupBoxCache,
    duplicateUserGroup,
    MD_GROUP_DUP_OFFSET,
  };
}
