/**
 * Marketing site chrome helpers (nav wordmark). Analytics loads via consent-scripts.js only.
 */
(function () {
  "use strict";

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
