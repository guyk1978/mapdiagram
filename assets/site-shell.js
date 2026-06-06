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

  function enforceStickyHeader() {
    var header = document.querySelector("header.nav");
    if (!header) return;
    header.style.position = "fixed";
    header.style.top = "0";
    header.style.left = "0";
    header.style.right = "0";
    header.style.width = "100%";
    header.style.zIndex = "12000";

    var main = header.nextElementSibling;
    if (main && main.tagName === "MAIN") {
      var headerHeight = header.offsetHeight;
      if (headerHeight > 0) {
        document.documentElement.style.setProperty("--site-header-height", headerHeight + "px");
        main.style.marginTop = headerHeight + "px";
      }
    }
  }

  function svgMenuIcon() {
    return (
      '<svg class="nav-menu-toggle__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function svgCloseIcon() {
    return (
      '<svg class="nav-menu-toggle__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function isMobileNav() {
    return window.matchMedia("(max-width: 1024px)").matches;
  }

  function initMobileNav() {
    var header = document.querySelector("header.nav");
    var wrap = header && header.querySelector(".wrap");
    var nav = wrap && wrap.querySelector(".nav-links-main, .links");
    if (!header || !wrap || !nav || header.dataset.mobileNavWired === "1") return;
    header.dataset.mobileNavWired = "1";

    var cta = nav.querySelector(".nav-cta");
    var actions = document.createElement("div");
    actions.className = "nav-mobile-actions";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-menu-toggle";
    toggle.id = "siteNavToggle";
    toggle.setAttribute("aria-controls", "siteNavPanel");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    toggle.innerHTML = svgMenuIcon() + svgCloseIcon();

    if (cta) actions.appendChild(cta);
    actions.appendChild(toggle);
    wrap.appendChild(actions);

    nav.id = "siteNavPanel";
    nav.classList.add("nav-panel");

    var backdrop = document.createElement("div");
    backdrop.className = "nav-mobile-backdrop";
    backdrop.hidden = true;
    header.appendChild(backdrop);

    function setOpen(open) {
      header.classList.toggle("nav--menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      backdrop.hidden = !open;
      document.body.classList.toggle("site-nav-menu-open", open);
    }

    function closeMenu() {
      setOpen(false);
    }

    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("nav--menu-open"));
    });
    backdrop.addEventListener("click", closeMenu);
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    var mq = window.matchMedia("(max-width: 1024px)");
    mq.addEventListener("change", function () {
      if (!isMobileNav()) closeMenu();
      enforceStickyHeader();
    });
  }

  function onReady() {
    patchNavWordmark();
    ensureToggle();
    initMobileNav();
    enforceStickyHeader();
    window.addEventListener("resize", enforceStickyHeader);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
