import { createRuntimeContext } from "./runtime-context.js";
import { createOverlayRuntime } from "./overlay-runtime.js";
import { createSelectionRuntime } from "./selection-runtime.js";
import { createViewportRuntime } from "./viewport-runtime.js";
import { createRenderRuntime } from "./render-runtime.js";
import { createGroupRuntime } from "./group-runtime.js";
import { createCommandRuntime } from "./command-runtime.js";
import { createExportersRuntime } from "./exporters-runtime.js";
import { createSupabaseRuntime } from "./supabase-runtime.js";
import {
  GENEALOGY_WORKSPACE_PRESETS,
  GENEALOGY_SIDEBAR_TILE_SVG,
  genealogySidebarTileSvg,
  genealogySidebarTileMarkup,
  GENEALOGY_TOOLBAR_ICON_SVG,
  genealogyToolbarActionButtonMarkup,
  layoutGenealogySpouseEdge,
  layoutGenealogyNonSpouseEdge,
  installGenealogyRuntimeBridges,
} from "./genealogy-runtime.js";

const MapDiagramRuntime = {
  createRuntimeContext,
  createOverlayRuntime,
  createSelectionRuntime,
  createViewportRuntime,
  createRenderRuntime,
  createGroupRuntime,
  createCommandRuntime,
  createExportersRuntime,
  createSupabaseRuntime,
  GENEALOGY_WORKSPACE_PRESETS,
  GENEALOGY_SIDEBAR_TILE_SVG,
  GENEALOGY_TOOLBAR_ICON_SVG,
  genealogySidebarTileSvg,
  genealogySidebarTileMarkup,
  genealogyToolbarActionButtonMarkup,
  layoutGenealogySpouseEdge,
  layoutGenealogyNonSpouseEdge,
  installGenealogyRuntimeBridges,
};

if (typeof globalThis !== "undefined") {
  globalThis.MapDiagramRuntime = MapDiagramRuntime;
}

export {
  createRuntimeContext,
  createOverlayRuntime,
  createSelectionRuntime,
  createViewportRuntime,
  createRenderRuntime,
  createGroupRuntime,
  createCommandRuntime,
  createExportersRuntime,
  createSupabaseRuntime,
  GENEALOGY_WORKSPACE_PRESETS,
  GENEALOGY_SIDEBAR_TILE_SVG,
  GENEALOGY_TOOLBAR_ICON_SVG,
  genealogySidebarTileSvg,
  genealogySidebarTileMarkup,
  genealogyToolbarActionButtonMarkup,
  layoutGenealogySpouseEdge,
  layoutGenealogyNonSpouseEdge,
  installGenealogyRuntimeBridges,
};

if (typeof globalThis !== "undefined" && typeof globalThis.document !== "undefined") {
  const run = () => {
    let attempts = 0;
    const maxAttempts = 30;
    const tryInstall = () => {
      attempts += 1;
      const state = installGenealogyRuntimeBridges(globalThis);
      if ((state.toolbarReady && state.routingReady) || attempts >= maxAttempts) return;
      globalThis.setTimeout(tryInstall, 200);
    };
    tryInstall();
  };
  if (globalThis.document.readyState === "loading") {
    globalThis.document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
