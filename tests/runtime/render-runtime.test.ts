// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createRenderRuntime } from "../../src/runtime/render-runtime.js";
import { makeCtx, makeProject, makeRuntime } from "./helpers.js";

describe("render-runtime", () => {
  let rafCb: FrameRequestCallback | null = null;
  beforeEach(() => {
    rafCb = null;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      rafCb = null;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("invalidateInteractionCaches clears node and graph caches", () => {
    const runtime = makeRuntime({
      groupBoxCache: new Map([["g1", {}]]),
      nodeElById: new Map([["n1", document.createElement("div")]]),
      graphCache: {},
      graphCacheKey: "k",
    });
    const { ctx } = makeCtx(runtime, makeProject());
    const render = createRenderRuntime(ctx, {});
    render.invalidateInteractionCaches({ clearNodeEl: true, clearGraph: true });
    expect(runtime.groupBoxCache).toBeNull();
    expect(runtime.nodeElById.size).toBe(0);
    expect(runtime.graphCache).toBeNull();
    expect(runtime.graphCacheKey).toBe("");
  });

  it("pruneNodeElCache removes disconnected elements", () => {
    const detached = document.createElement("div");
    const runtime = makeRuntime({
      nodeElById: new Map([
        ["a", detached],
        ["b", document.createElement("div")],
      ]),
    });
    document.body.appendChild(runtime.nodeElById.get("b")!);
    const { ctx } = makeCtx(runtime, makeProject());
    const render = createRenderRuntime(ctx, {});
    render.pruneNodeElCache();
    expect(runtime.nodeElById.has("a")).toBe(false);
    expect(runtime.nodeElById.has("b")).toBe(true);
  });

  it("scheduleRenderConnections coalesces to one RAF callback", () => {
    const renderConnections = vi.fn();
    const renderSelection = vi.fn();
    const runtime = makeRuntime();
    const { ctx } = makeCtx(runtime, makeProject());
    const render = createRenderRuntime(ctx, { renderConnections, renderSelection });
    render.scheduleRenderConnections();
    render.scheduleRenderConnections();
    expect(rafCb).toBeTruthy();
    rafCb!(0);
    expect(renderConnections).toHaveBeenCalledTimes(1);
    expect(renderSelection).toHaveBeenCalledTimes(1);
  });
});
