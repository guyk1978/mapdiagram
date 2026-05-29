/**
 * Marketing site chrome: GA4, theme persistence, nav wordmark (toggle via site-shell.js).
 */
(function () {
  "use strict";

  var isToolApp =
    /^\/app\/tool\.html$/i.test(location.pathname) ||
    /\/app\/tool\.html$/i.test(location.href);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  window.gtag = gtag;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=G-LDVB4978S7";
  s.onload = function () {
    gtag("js", new Date());
    gtag("config", "G-LDVB4978S7");
  };
  document.head.appendChild(s);

  /** Typographic wordmark — site-shell.js (deferred in page footer) also patches nav */
  function patchNavWordmark() {
    document.querySelectorAll(".nav-brand").forEach(function (brand) {
      if (brand.querySelector(".nav-wordmark")) return;
      var strong = brand.querySelector("strong");
      if (!strong || strong.textContent.trim() !== "MapDiagram") return;
      var mini = brand.querySelector(".header-nodes-mini");
      if (mini) mini.remove();
      var mark = document.createElement("span");
      mark.className = "nav-wordmark";
      mark.setAttribute("aria-label", "MapDiagram");
      mark.innerHTML =
        '<span class="nav-wordmark__map">Map</span>' +
        '<span class="nav-wordmark__diagram">D<span class="nav-wordmark__i" aria-hidden="true">i</span>agram</span>';
      strong.replaceWith(mark);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", patchNavWordmark);
  } else {
    patchNavWordmark();
  }
})();
