import { describe, expect, it, vi } from "vitest";
import { createCommandRuntime } from "../../src/runtime/command-runtime.js";
import { createRuntimeContext } from "../../src/runtime/runtime-context.js";
import { makeRuntime } from "./helpers.js";

describe("command-runtime", () => {
  it("register and execute with single pushHistory", () => {
    const pushHistory = vi.fn();
    const runtime = makeRuntime();
    const ctx = createRuntimeContext({
      runtime,
      getProject: () => ({ nodes: [] }),
      markDirty: () => {},
    });
    const cmd = createCommandRuntime(ctx, { pushHistory });
    const execute = vi.fn(() => "ok");
    cmd.registerCommand("test", { execute });
    expect(cmd.executeCommand("test", { x: 1 })).toBe("ok");
    expect(pushHistory).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ x: 1 }, ctx);
  });

  it("opts.pushHistory false skips history", () => {
    const pushHistory = vi.fn();
    const ctx = createRuntimeContext({
      runtime: makeRuntime(),
      getProject: () => ({ nodes: [] }),
      markDirty: () => {},
    });
    const cmd = createCommandRuntime(ctx, { pushHistory });
    cmd.registerCommand("noop", { execute: () => {} });
    cmd.executeCommand("noop", {}, { pushHistory: false });
    expect(pushHistory).not.toHaveBeenCalled();
  });

  it("throws on unknown command", () => {
    const ctx = createRuntimeContext({
      runtime: makeRuntime(),
      getProject: () => ({ nodes: [] }),
      markDirty: () => {},
    });
    const cmd = createCommandRuntime(ctx, { pushHistory: () => {} });
    expect(() => cmd.executeCommand("missing", {})).toThrow(/Unknown command/);
  });
});
