/**
 * Render cache invalidation and connection RAF scheduling (Phase 6).
 */

export function createRenderRuntime(ctx, deps) {
  const { runtime } = ctx;

  function invalidateInteractionCaches(opts = {}) {
    runtime.groupBoxCache = null;
    if (opts.clearNodeEl) runtime.nodeElById.clear();
    if (opts.clearGraph) {
      runtime.graphCache = null;
      runtime.graphCacheKey = "";
    }
  }

  function pruneNodeElCache() {
    for (const [id, el] of runtime.nodeElById) {
      if (!el || !el.isConnected) runtime.nodeElById.delete(id);
    }
  }

  function scheduleRenderConnections() {
    if (runtime.renderConnectionsRaf) cancelAnimationFrame(runtime.renderConnectionsRaf);
    runtime.renderConnectionsRaf = requestAnimationFrame(() => {
      runtime.renderConnectionsRaf = null;
      deps.renderConnections?.();
      deps.renderSelection?.();
    });
  }

  const dirty = { full: false, connections: false, selection: false };

  function requestRender(flags = {}) {
    if (flags.full) dirty.full = true;
    if (flags.connections) dirty.connections = true;
    if (flags.selection) dirty.selection = true;
    if (flags.connections || flags.selection) scheduleRenderConnections();
    else if (flags.full && typeof deps.scheduleFullRender === "function") deps.scheduleFullRender();
  }

  function flush() {
    if (dirty.full) {
      dirty.full = false;
      deps.scheduleFullRender?.();
      return;
    }
    if (dirty.connections || dirty.selection) {
      dirty.connections = false;
      dirty.selection = false;
      scheduleRenderConnections();
    }
  }

  return {
    invalidateInteractionCaches,
    pruneNodeElCache,
    scheduleRenderConnections,
    requestRender,
    flush,
  };
}
