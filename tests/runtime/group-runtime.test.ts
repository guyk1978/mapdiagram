import { describe, expect, it, vi } from "vitest";
import { createGroupRuntime } from "../../src/runtime/group-runtime.js";
import { createSelectionRuntime } from "../../src/runtime/selection-runtime.js";
import { createRenderRuntime } from "../../src/runtime/render-runtime.js";
import { makeCtx, makeRuntime } from "./helpers.js";

function makeGroupFixture() {
  const project = {
    projectId: "p1",
    _groupLocalSpace: 1,
    nodes: [
      { id: "n1", x: 10, y: 20, label: "A" },
      { id: "n2", x: 50, y: 60, label: "B" },
    ],
    connections: [{ id: "c1", kind: "node-node", from: "n1", to: "n2" }],
    userGroups: [
      {
        id: "g1",
        name: "Root",
        nodeIds: ["n1", "n2"],
        childGroupIds: [],
        parentGroupId: null,
        hierarchyDepth: 0,
      },
    ],
    groupConnections: [],
    view: { x: 0, y: 0, zoom: 1 },
  };
  let uidN = 0;
  const runtime = makeRuntime();
  const { ctx } = makeCtx(runtime, project as never);
  const selectionRuntime = createSelectionRuntime(ctx, {});
  const renderRuntime = createRenderRuntime(ctx, {});
  const groupRuntime = createGroupRuntime(ctx, {
    groupDupOffset: 40,
    pushHistoryOnDuplicate: false,
    ensureProjectExtras: () => {},
    userGroupById: (p: typeof project, id: string) => p.userGroups.find((g) => g.id === id),
    uid: () => `new-${++uidN}`,
    deepCopy: <T>(x: T) => JSON.parse(JSON.stringify(x)),
    normalizeGroup: (g: Record<string, unknown>) => g,
    normalizeNode: (n: Record<string, unknown>) => n,
    getSubtreeGroupIdsSet: (_p: unknown, id: string) => new Set([id]),
    getAllNodeIdsInGroupSubtree: (p: typeof project, gid: string) => {
      const g = p.userGroups.find((x) => x.id === gid);
      return g?.nodeIds || [];
    },
    getNodeById: (id: string) => project.nodes.find((n) => n.id === id),
    isNodeNodeConnection: (c: { kind?: string }) => c.kind === "node-node",
    isBranchFromConnection: () => false,
    selectionRuntime,
    renderRuntime,
    computeUserGroupBox: () => ({ x: 0, y: 0, w: 100, h: 100 }),
    scheduleFullRender: () => {},
    sanitizeSelection: () => {},
    assertProjectIntegrity: () => {},
  });
  return { project, runtime, groupRuntime };
}

describe("group-runtime", () => {
  it("duplicateUserGroup creates new ids without duplicates", () => {
    const { project, runtime, groupRuntime } = makeGroupFixture();
    const beforeNodes = project.nodes.length;
    const beforeGroups = project.userGroups.length;
    const newRootId = groupRuntime.duplicateUserGroup("g1");
    expect(newRootId).toMatch(/^new-/);
    expect(project.nodes.length).toBe(beforeNodes + 2);
    expect(project.userGroups.length).toBe(beforeGroups + 1);
    const ids = new Set(project.nodes.map((n) => n.id));
    expect(ids.size).toBe(project.nodes.length);
    expect(runtime.selectedGroupId).toBe(newRootId);
    expect(runtime.selectedGroupIds.has(newRootId)).toBe(true);
  });

  it("getUserGroupBox caches per project", () => {
    const { project, groupRuntime } = makeGroupFixture();
    const compute = vi.fn(() => ({ x: 1, y: 2, w: 3, h: 4 }));
    const { ctx } = makeCtx(makeRuntime(), project as never);
    const gr = createGroupRuntime(ctx, {
      computeUserGroupBox: compute,
      userGroupById: (p: typeof project, id: string) => p.userGroups.find((g) => g.id === id),
    });
    expect(gr.getUserGroupBox("g1")).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(gr.getUserGroupBox("g1")).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(compute).toHaveBeenCalledTimes(1);
  });
});
