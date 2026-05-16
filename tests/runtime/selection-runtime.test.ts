import { describe, expect, it, vi } from "vitest";
import { createSelectionRuntime } from "../../src/runtime/selection-runtime.js";
import { makeCtx, makeProject, makeRuntime } from "./helpers.js";

describe("selection-runtime", () => {
  it("isAdditive respects shift and sticky mode", () => {
    const runtime = makeRuntime({ stickyMultiSelect: false });
    const { ctx } = makeCtx(runtime, makeProject());
    const sel = createSelectionRuntime(ctx, {});
    expect(sel.isAdditive({ shiftKey: true })).toBe(true);
    expect(sel.isAdditive({ shiftKey: false })).toBe(false);
    runtime.stickyMultiSelect = true;
    expect(sel.isAdditive({ shiftKey: false })).toBe(true);
  });

  it("sanitizeSelection drops stale ids and syncs orphan guard", () => {
    const project = makeProject({
      nodes: [{ id: "n1", x: 0, y: 0 }],
      userGroups: [],
    });
    const runtime = makeRuntime({
      selectedNodeIds: new Set(["n1", "gone"]),
      selectedNodeId: "gone",
      focusNodeId: "gone",
    });
    const orphanGuard = vi.fn();
    const { ctx } = makeCtx(runtime, project);
    const sel = createSelectionRuntime(ctx, { syncFocusModalOrphanGuard: orphanGuard });
    sel.sanitizeSelection();
    expect(runtime.selectedNodeIds.has("gone")).toBe(false);
    expect(runtime.focusNodeId).toBeNull();
    expect(orphanGuard).toHaveBeenCalled();
  });

  it("clearAllForUndo clears all selection fields", () => {
    const runtime = makeRuntime({
      selectedNodeId: "n1",
      selectedNodeIds: new Set(["n1"]),
      selectedGroupId: "g1",
      selectedGroupIds: new Set(["g1"]),
      selectedConnectionId: "c1",
      selectedConnectionIds: new Set(["c1"]),
      selectedGroupConnId: "gc1",
      selectedGroupConnIds: new Set(["gc1"]),
      selectedFlowGroupId: "fg1",
    });
    const { ctx } = makeCtx(runtime, makeProject());
    const sel = createSelectionRuntime(ctx, {});
    sel.clearAllForUndo();
    expect(runtime.selectedNodeIds.size).toBe(0);
    expect(runtime.selectedGroupIds.size).toBe(0);
    expect(runtime.selectedConnectionIds.size).toBe(0);
    expect(runtime.selectedGroupConnIds.size).toBe(0);
    expect(runtime.selectedFlowGroupId).toBeNull();
  });
});
