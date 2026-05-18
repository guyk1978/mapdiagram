/**
 * MapDiagram runtime diagnostics — opt-in only (zero overhead when disabled).
 * Enable: URL ?mdPerf=1 or localStorage md_debug_perf = "1"
 */
(function () {
  "use strict";

  function perfEnabled() {
    try {
      if (typeof location !== "undefined" && /(?:\?|&)mdPerf=1(?:&|$)/.test(location.search || "")) return true;
      if (typeof localStorage !== "undefined" && localStorage.getItem("md_debug_perf") === "1") return true;
    } catch (_) {}
    return false;
  }

  var markTs = Object.create(null);

  window.MDRuntimeProfiler = {
    perfEnabled: perfEnabled,

    markStart: function (name) {
      if (!perfEnabled()) return;
      try {
        performance.mark("md-s-" + name);
        markTs[name] = performance.now();
      } catch (_) {}
    },

    markEnd: function (name, verbose) {
      if (!perfEnabled()) return;
      try {
        performance.mark("md-e-" + name);
        performance.measure("md:" + name, "md-s-" + name, "md-e-" + name);
        var ms = performance.now() - (markTs[name] || performance.now());
        var entry = performance.getEntriesByName("md:" + name).pop();
        if (entry) ms = entry.duration;
        delete markTs[name];
        if (verbose !== false && typeof console !== "undefined" && console.info) {
          console.info("[MapDiagram][perf]", name, (Math.round(ms * 100) / 100) + "ms");
        }
      } catch (_) {}
    },

    measureSync: function (name, fn) {
      if (!perfEnabled()) return fn();
      this.markStart(name);
      try {
        return fn();
      } finally {
        this.markEnd(name);
      }
    },

    measureAsync: async function (name, fn) {
      if (!perfEnabled()) return fn();
      this.markStart(name);
      try {
        return await fn();
      } finally {
        this.markEnd(name);
      }
    },

    counterInc: function (key, delta) {
      if (!perfEnabled()) return;
      try {
        window.__mdDbgCounters = window.__mdDbgCounters || {};
        window.__mdDbgCounters[key] = (window.__mdDbgCounters[key] || 0) + (delta || 1);
      } catch (_) {}
    },

    countersSnapshot: function () {
      try {
        return Object.assign({}, window.__mdDbgCounters || {});
      } catch (_) {
        return {};
      }
    },

    /** Escape text for safe insertion into HTML when DOM APIs aren't convenient */
    escapeHtml: function (s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },
  };
})();
