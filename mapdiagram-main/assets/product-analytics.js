/**
 * Product analytics helpers (GA4 events).
 */
(function () {
  function mdTrack(eventName, params) {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, params || {});
      }
    } catch (_) {
      /* ignore */
    }
  }

  window.MapDiagramAnalytics = {
    track: mdTrack,
    publishFlowchart: (p) => mdTrack("publish_flowchart", p),
    publicView: (p) => mdTrack("public_view", p),
    exportPng: (p) => mdTrack("export_png", p),
    templateApply: (p) => mdTrack("template_apply", p),
    starterPromptClick: (p) => mdTrack("starter_prompt_click", p),
    editAfterGenerate: (p) => mdTrack("edit_after_generate", p),
    shareAfterExport: (p) => mdTrack("share_after_export", p),
  };
})();
