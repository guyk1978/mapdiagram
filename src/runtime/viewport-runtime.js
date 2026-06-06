/**
 * Viewport transform state (Phase 6).
 */

function readZoomLimits() {
  if (typeof document === "undefined") return { min: 0.2, max: 2.2 };
  const style = getComputedStyle(document.documentElement);
  const min = parseFloat(style.getPropertyValue("--zoom-min"));
  const max = parseFloat(style.getPropertyValue("--zoom-max"));
  return {
    min: Number.isFinite(min) ? min : 0.2,
    max: Number.isFinite(max) ? max : 2.2,
  };
}

function clampZoom(z) {
  const { min, max } = readZoomLimits();
  return Math.max(min, Math.min(max, z));
}

export function createViewportRuntime(ctx, deps) {
  const { runtime, dom, markDirty } = ctx;

  function getView() {
    return { ...ctx.getProject().view };
  }

  function world(clientX, clientY) {
    const p = ctx.getProject();
    const workspace = dom.workspace;
    if (!workspace) return { x: 0, y: 0 };
    const r = workspace.getBoundingClientRect();
    return {
      x: (clientX - r.left - p.view.x) / p.view.zoom,
      y: (clientY - r.top - p.view.y) / p.view.zoom,
    };
  }

  function updateViewport() {
    const v = ctx.getProject().view;
    if (v.grid == null) v.grid = true;
    runtime.showGrid = !!v.grid;
    dom.workspace?.classList.toggle("grid-off", !runtime.showGrid);
    if (deps.gridToggleBtn) {
      deps.gridToggleBtn.textContent = runtime.showGrid ? "Grid On" : "Grid Off";
    }
    if (dom.viewport) {
      dom.viewport.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
    }
    const zoomResetBtn = document.getElementById("zoomResetBtn");
    if (zoomResetBtn) zoomResetBtn.textContent = `${Math.round(v.zoom * 100)}%`;
    deps.paintMinimap?.();
  }

  function zoomAt(clientX, clientY, nextZoom) {
    const p = ctx.getProject();
    const workspace = dom.workspace;
    if (!workspace) return;
    const prev = p.view.zoom;
    const z = clampZoom(nextZoom);
    if (z === prev) return;
    const r = workspace.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    p.view.x = px - (px - p.view.x) * (z / prev);
    p.view.y = py - (py - p.view.y) * (z / prev);
    p.view.zoom = z;
    updateViewport();
    markDirty();
  }

  function fitToScreen() {
    const p = ctx.getProject();
    const workspace = dom.workspace;
    if (!workspace) return;
    if (!p.nodes.length) {
      p.view = { ...p.view, x: 0, y: 0, zoom: 1 };
      updateViewport();
      markDirty();
      return;
    }
    const isHidden = deps.isNodeHiddenCanvas || (() => false);
    const getNodeWorldPosition = deps.getNodeWorldPosition;
    const vis = p.nodes.filter((n) => !isHidden(n));
    const boundsNodes = vis.length ? vis : p.nodes;
    const minX = Math.min(...boundsNodes.map((n) => getNodeWorldPosition(n).x));
    const minY = Math.min(...boundsNodes.map((n) => getNodeWorldPosition(n).y));
    const maxX = Math.max(...boundsNodes.map((n) => getNodeWorldPosition(n).x + n.width));
    const maxY = Math.max(...boundsNodes.map((n) => getNodeWorldPosition(n).y + n.height));
    const contentW = Math.max(100, maxX - minX + 120);
    const contentH = Math.max(100, maxY - minY + 120);
    const r = workspace.getBoundingClientRect();
    const zoom = clampZoom(Math.min(r.width / contentW, r.height / contentH));
    p.view.zoom = zoom;
    p.view.x = (r.width - contentW * zoom) / 2 - (minX - 60) * zoom;
    p.view.y = (r.height - contentH * zoom) / 2 - (minY - 60) * zoom;
    updateViewport();
    markDirty();
  }

  return {
    world,
    updateViewport,
    zoomAt,
    fitToScreen,
    getView,
  };
}
