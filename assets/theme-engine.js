/**
 * MapDiagram — global theme runtime (site + tool, no reload).
 * Storage: localStorage mapdiagram-theme = "light" | "dark"
 * Optional: mapdiagram-contrast = "high" for data-contrast on <html>
 */
(function () {
  "use strict";

  var THEME_KEY = "mapdiagram-theme";
  var CONTRAST_KEY = "mapdiagram-contrast";

  function applyContrastFromStorage() {
    try {
      var c = localStorage.getItem(CONTRAST_KEY);
      if (c === "high") document.documentElement.setAttribute("data-contrast", "high");
      else document.documentElement.removeAttribute("data-contrast");
    } catch (_) {}
  }

  function applyThemeToDocument(mode, skipStorage) {
    var m = mode === "light" ? "light" : "dark";
    if (m === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    if (!skipStorage) {
      try {
        localStorage.setItem(THEME_KEY, m);
      } catch (_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent("mapdiagram-theme-change", { detail: { mode: m } }));
    } catch (_) {}
    notifyParent(m);
  }

  function notifyParent(mode) {
    try {
      if (window.parent === window) return;
      window.parent.postMessage({ type: "mapdiagram-theme", mode: mode, source: "mapdiagram-tool" }, "*");
    } catch (_) {}
  }

  function initFromStorage() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    } catch (_) {}
    applyContrastFromStorage();
  }

  window.addEventListener("message", function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== "mapdiagram-theme-sync") return;
    applyThemeToDocument(d.mode === "light" ? "light" : "dark", true);
    try {
      localStorage.setItem(THEME_KEY, d.mode === "light" ? "light" : "dark");
    } catch (_) {}
  });

  window.MapDiagramTheme = {
    key: THEME_KEY,
    get: function () {
      return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    },
    set: function (mode) {
      applyThemeToDocument(mode === "light" ? "light" : "dark", false);
    },
    setContrast: function (level) {
      if (level === "high") {
        document.documentElement.setAttribute("data-contrast", "high");
        try {
          localStorage.setItem(CONTRAST_KEY, "high");
        } catch (_) {}
      } else {
        document.documentElement.removeAttribute("data-contrast");
        try {
          localStorage.removeItem(CONTRAST_KEY);
        } catch (_) {}
      }
    },
    init: initFromStorage
  };

  initFromStorage();
})();
