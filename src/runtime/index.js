import { createRuntimeContext } from "./runtime-context.js";
import { createOverlayRuntime } from "./overlay-runtime.js";
import { createSelectionRuntime } from "./selection-runtime.js";
import { createViewportRuntime } from "./viewport-runtime.js";
import { createRenderRuntime } from "./render-runtime.js";
import { createGroupRuntime } from "./group-runtime.js";
import { createCommandRuntime } from "./command-runtime.js";
import { createExportersRuntime } from "./exporters-runtime.js";
import { createSupabaseRuntime } from "./supabase-runtime.js";

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
};
