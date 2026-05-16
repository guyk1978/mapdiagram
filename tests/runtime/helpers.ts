import { createRuntimeContext } from "../../src/runtime/runtime-context.js";

export function makeRuntime(overrides: Record<string, unknown> = {}) {
  return {
    selectedNodeId: null,
    selectedNodeIds: new Set<string>(),
    selectedGroupId: null,
    selectedGroupIds: new Set<string>(),
    selectedConnectionId: null,
    selectedConnectionIds: new Set<string>(),
    selectedGroupConnId: null,
    selectedGroupConnIds: new Set<string>(),
    selectedFlowGroupId: null,
    stickyMultiSelect: false,
    readOnly: false,
    focusNodeId: null,
    focusClosing: false,
    focusModalHistoryPrimed: false,
    focusModalWatchdog: null,
    groupBoxCache: null as Map<string, unknown> | null,
    groupBoxCacheProjectId: null as string | null,
    nodeElById: new Map<string, Element>(),
    graphCache: null,
    graphCacheKey: "",
    renderConnectionsRaf: null as number | null,
    connectionUi: {} as Record<string, unknown>,
    showGrid: true,
    ...overrides,
  };
}

export function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "p1",
    nodes: [
      { id: "n1", x: 0, y: 0, label: "A" },
      { id: "n2", x: 100, y: 0, label: "B" },
    ],
    connections: [],
    userGroups: [{ id: "g1", name: "G1", nodeIds: ["n1"], childGroupIds: [], parentGroupId: null }],
    groupConnections: [],
    view: { x: 0, y: 0, zoom: 1, grid: true },
    ...overrides,
  };
}

export function makeCtx(
  runtime: ReturnType<typeof makeRuntime>,
  project: ReturnType<typeof makeProject>,
  dom: Record<string, Element | null> = {},
  emit: (type: string, payload?: unknown) => void = () => {}
) {
  let dirty = false;
  return {
    ctx: createRuntimeContext({
      runtime,
      getProject: () => project,
      markDirty: () => {
        dirty = true;
      },
      dom,
      emit,
    }),
    get dirty() {
      return dirty;
    },
    project,
  };
}
