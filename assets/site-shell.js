/**
 * Marketing site shell: theme toggle + nav enhancements (excludes app/tool.html).
 */
(function () {
  "use strict";

  if (/^\/app\/tool\.html$/i.test(location.pathname) || /\/app\/tool\.html$/i.test(location.href)) {
    return;
  }

  function svgSun() {
    return (
      '<svg class="icon-theme-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function svgMoon() {
    return (
      '<svg class="icon-theme-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }

  function bindThemeToggle(btn) {
    if (!btn || btn.dataset.wired === "1") return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", function () {
      var theme = window.MapDiagramTheme;
      if (!theme) return;
      theme.set(theme.get() === "light" ? "dark" : "light");
    });
  }

  function ensureToggle() {
    var existing = document.getElementById("siteThemeToggle");
    if (existing) {
      bindThemeToggle(existing);
      return;
    }

    var nav = document.querySelector(".nav .links, .nav .nav-links-main");
    if (!nav) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle-btn";
    btn.id = "siteThemeToggle";
    btn.setAttribute("aria-label", "Toggle light and dark mode");
    btn.innerHTML = svgSun() + svgMoon();

    var cta = nav.querySelector(".nav-cta");
    if (cta) nav.insertBefore(btn, cta);
    else nav.appendChild(btn);

    bindThemeToggle(btn);
  }

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

  function onReady() {
    patchNavWordmark();
    ensureToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
