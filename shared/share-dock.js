/**
 * MapDiagram — global floating share dock (one instance per document).
 * Styles: /shared/share-dock.css (injected here if not already loaded, e.g. via @import in site.css).
 * API: window.ShareDock.show | hide | toggle | destroy | copy | native | toast | refresh
 *
 * Editor (tool.html): when no published view URL, all actions share a diagram PNG snapshot
 * via window.MapDiagramShare.shareSnapshot(). After Publish, link mode uses view.html?slug=...
 */
(function () {
  "use strict";

  if (window.__shareDockMounted) return;
  window.__shareDockMounted = true;

  var injectedStylesheetEl = null;
  var teardownFns = [];

  function addTeardown(fn) {
    teardownFns.push(fn);
  }

  function runTeardown() {
    for (var i = 0; i < teardownFns.length; i++) {
      try {
        teardownFns[i]();
      } catch (_) {}
    }
    teardownFns.length = 0;
  }

  function shareDockCssActive() {
    if (document.getElementById("shareDockStylesheet")) return true;
    try {
      var sheets = document.styleSheets;
      for (var i = 0; i < sheets.length; i++) {
        var h = sheets[i].href || "";
        if (h.indexOf("share-dock.css") !== -1) return true;
      }
    } catch (_) {}
    return false;
  }

  function ensureShareDockStyles() {
    if (shareDockCssActive()) return;
    var link = document.createElement("link");
    link.id = "shareDockStylesheet";
    link.rel = "stylesheet";
    link.href = "/shared/share-dock.css";
    document.head.appendChild(link);
    injectedStylesheetEl = link;
  }

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  var ICONS = {
    copy:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5 15.5V5.5C5 4.67 5.67 4 6.5 4H15"/></svg>',
    native:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="M7 9l5-5 5 5"/><path d="M5 14v3.5A2.5 2.5 0 0 0 7.5 20h9A2.5 2.5 0 0 0 19 17.5V14"/></svg>',
    twitter:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.53 3H20.5l-6.6 7.55L21.5 21h-6.05l-4.74-6.2L5.3 21H2.32l7.05-8.07L2 3h6.2l4.27 5.66L17.53 3Zm-1.06 16.2h1.66L7.6 4.7H5.84l10.63 14.5Z"/></svg>',
    facebook:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.55l.4-3H13.5V8.6c0-.86.27-1.45 1.5-1.45h1.6V4.45A22 22 0 0 0 14.3 4.3c-2.3 0-3.8 1.4-3.8 3.97V10.5H8v3h2.5V21h3Z"/></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.5 4a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Zm-1.4 4.8h2.8V20H4.1V8.8Zm5 0h2.7v1.6h.04c.38-.7 1.32-1.46 2.72-1.46 2.9 0 3.44 1.85 3.44 4.27V20h-2.85v-5.4c0-1.29-.02-2.96-1.83-2.96-1.83 0-2.11 1.4-2.11 2.86V20H9.1V8.8Z"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.1 4.9A9.9 9.9 0 0 0 4.7 18.6L3.3 22l3.55-1.4A9.9 9.9 0 0 0 19.1 4.9Zm-7.07 15.3c-1.7 0-3.36-.46-4.81-1.32l-.34-.2-2.1.83.84-2.04-.22-.36a8.18 8.18 0 1 1 6.63 3.09Zm4.6-6.1c-.25-.13-1.5-.74-1.74-.83-.23-.08-.4-.13-.57.13-.16.25-.65.83-.8 1-.15.16-.3.18-.55.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.45.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.44-.06-.13-.57-1.36-.78-1.86-.2-.5-.4-.43-.57-.43h-.49c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.21.88 2.39 1 2.55.13.16 1.74 2.65 4.22 3.71.59.25 1.05.41 1.41.53.59.19 1.13.16 1.55.1.47-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.29Z"/></svg>',
    telegram:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 4.32 18.4 19.7c-.24 1.07-.88 1.34-1.78.83l-4.92-3.62-2.37 2.28c-.26.26-.48.48-.99.48l.35-5 9.1-8.22c.4-.35-.09-.55-.6-.2L6.93 12.4l-4.85-1.51c-1.05-.33-1.07-1.05.22-1.55L20.21 2.6c.88-.33 1.65.2 1.39 1.72Z"/></svg>'
  };

  function externalHref(platformId, url, title) {
    var txt = title;
    switch (platformId) {
      case "twitter":
        return (
          "https://twitter.com/intent/tweet?url=" +
          encodeURIComponent(url) +
          "&text=" +
          encodeURIComponent(txt)
        );
      case "facebook":
        return "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
      case "linkedin":
        return "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url);
      case "whatsapp":
        return "https://wa.me/?text=" + encodeURIComponent(txt + " " + url);
      case "telegram":
        return (
          "https://t.me/share/url?url=" +
          encodeURIComponent(url) +
          "&text=" +
          encodeURIComponent(txt)
        );
      default:
        return url;
    }
  }

  function buildPlatformMeta() {
    var list = [{ id: "copy", label: "Copy link", external: false }];
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      list.push({ id: "native", label: "Share", external: false });
    }
    list.push(
      { id: "twitter", label: "Share on X", external: true },
      { id: "facebook", label: "Share on Facebook", external: true },
      { id: "linkedin", label: "Share on LinkedIn", external: true },
      { id: "whatsapp", label: "Share on WhatsApp", external: true },
      { id: "telegram", label: "Share on Telegram", external: true }
    );
    return list;
  }

  /** @returns {{ mode: "link"|"snapshot", url: string, title: string }} */
  function resolveShareMode() {
    var hooks = window.MapDiagramShare;
    var title = document.title || "MapDiagram";
    if (hooks && typeof hooks.isEditorPage === "function" && hooks.isEditorPage()) {
      var pub =
        typeof hooks.getPublishedViewUrl === "function" ? hooks.getPublishedViewUrl() : null;
      if (pub) return { mode: "link", url: String(pub), title: title };
      return { mode: "snapshot", url: "", title: title };
    }
    return { mode: "link", url: window.location.href, title: title };
  }

  var origPush = null;
  var origReplace = null;
  var historyPatched = false;

  function patchHistory(cb) {
    if (historyPatched) return;
    historyPatched = true;
    origPush = history.pushState;
    origReplace = history.replaceState;
    history.pushState = function () {
      var r = origPush.apply(this, arguments);
      cb();
      return r;
    };
    history.replaceState = function () {
      var r = origReplace.apply(this, arguments);
      cb();
      return r;
    };
  }

  function unpatchHistory() {
    if (!historyPatched) return;
    history.pushState = origPush;
    history.replaceState = origReplace;
    historyPatched = false;
    origPush = null;
    origReplace = null;
  }

  var MOBILE_MQ = window.matchMedia("(max-width: 1024px)");

  function isEditorPage() {
    var hooks = window.MapDiagramShare;
    if (hooks && typeof hooks.isEditorPage === "function" && hooks.isEditorPage()) return true;
    return /\/app\/tool\.html/i.test(location.pathname);
  }

  function isMobileShareLayout() {
    return MOBILE_MQ.matches;
  }

  function findHeaderShareAnchor() {
    var editorAnchor = document.getElementById("topbarShareHost");
    if (editorAnchor) return { el: editorAnchor, kind: "editor" };
    var navActions = document.querySelector("header.nav .nav-mobile-actions");
    if (navActions) return { el: navActions, kind: "site" };
    return null;
  }

  onReady(function mount() {
    ensureShareDockStyles();
    if (document.getElementById("shareDock")) return;

    var dock = document.createElement("nav");
    dock.id = "shareDock";
    dock.className = "share-dock";
    dock.setAttribute("aria-label", "Share this page");
    dock.setAttribute("role", "toolbar");

    var STORAGE_VISIBLE = "mapdiagram-share-dock-visible";

    function persistVisible(expanded) {
      try {
        localStorage.setItem(STORAGE_VISIBLE, expanded ? "1" : "0");
      } catch (_) {}
    }

    function setExpanded(expanded) {
      dock.style.display = "";
      if (expanded) {
        dock.classList.remove("is-collapsed");
        dock.setAttribute("aria-expanded", "true");
      } else {
        dock.classList.add("is-collapsed");
        dock.setAttribute("aria-expanded", "false");
      }
      persistVisible(expanded);
    }

    var expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "share-dock-expand";
    expandBtn.setAttribute("aria-label", "Open share options");
    expandBtn.setAttribute("title", "Share");
    expandBtn.textContent = "Share";
    expandBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setExpanded(true);
    });
    dock.appendChild(expandBtn);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "share-dock-close";
    closeBtn.setAttribute("aria-label", "Minimize share panel");
    closeBtn.setAttribute("title", "Minimize");
    closeBtn.textContent = "\u2212";
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setExpanded(false);
    });
    dock.appendChild(closeBtn);

    var meta = buildPlatformMeta();
    for (var i = 0; i < meta.length; i++) {
      var p = meta[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "share-dock-btn";
      if (p.external) {
        btn.classList.add("share-dock-external");
        btn.dataset.sharePlatform = p.id;
      } else {
        btn.dataset.shareAction = p.id;
      }
      btn.dataset.tooltip = p.label;
      btn.setAttribute("aria-label", p.label);
      btn.setAttribute("title", p.label);
      btn.innerHTML = ICONS[p.id] || "";
      dock.appendChild(btn);
    }
    document.body.appendChild(dock);

    var toast = document.createElement("div");
    toast.id = "shareDockToast";
    toast.className = "share-dock-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);

    var toastTimer = 0;
    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("is-open");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        toast.classList.remove("is-open");
      }, 2200);
    }

    function applyShareMode() {
      var mode = resolveShareMode();
      dock.dataset.shareMode = mode.mode;
      var copyBtn = dock.querySelector('[data-share-action="copy"]');
      var nativeBtn = dock.querySelector('[data-share-action="native"]');
      if (mode.mode === "snapshot") {
        if (copyBtn) {
          copyBtn.setAttribute("title", "Share diagram image");
          copyBtn.setAttribute("aria-label", "Share diagram image");
        }
        if (nativeBtn) {
          nativeBtn.setAttribute("title", "Share diagram image");
          nativeBtn.setAttribute("aria-label", "Share diagram image");
        }
        dock.setAttribute("aria-label", "Share diagram as image");
      } else {
        if (copyBtn) {
          copyBtn.setAttribute("title", "Copy link");
          copyBtn.setAttribute("aria-label", "Copy link");
        }
        if (nativeBtn) {
          nativeBtn.setAttribute("title", "Share link");
          nativeBtn.setAttribute("aria-label", "Share link");
        }
        dock.setAttribute("aria-label", "Share this page");
      }
      rebuildHeaderShareMenu();
    }

    applyShareMode();

    /* —— Mobile header share (≤1024px): editor topbar or marketing site nav —— */
    var headerHost = null;
    var headerBtn = null;
    var headerMenu = null;

    function closeHeaderShareMenu() {
      if (!headerMenu || !headerBtn) return;
      headerMenu.classList.remove("open");
      headerMenu.hidden = true;
      headerBtn.setAttribute("aria-expanded", "false");
      resetHeaderShareMenuPosition();
    }

    function resetHeaderShareMenuPosition() {
      if (!headerMenu) return;
      headerMenu.style.position = "";
      headerMenu.style.top = "";
      headerMenu.style.bottom = "";
      headerMenu.style.left = "";
      headerMenu.style.right = "";
      headerMenu.style.maxWidth = "";
      headerMenu.style.maxHeight = "";
      headerMenu.style.overflowY = "";
    }

    function getShareMenuViewportBounds() {
      var margin = 10;
      var vv = window.visualViewport;
      var viewTop = (vv ? vv.offsetTop : 0) + margin;
      var viewLeft = (vv ? vv.offsetLeft : 0) + margin;
      var viewRight = (vv ? vv.offsetLeft + vv.width : window.innerWidth) - margin;
      var viewBottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - margin;
      return {
        top: viewTop,
        left: viewLeft,
        right: viewRight,
        bottom: viewBottom,
        width: Math.max(160, viewRight - viewLeft),
        height: Math.max(120, viewBottom - viewTop),
      };
    }

    function positionHeaderShareMenu() {
      if (!headerBtn || !headerMenu || !headerMenu.classList.contains("open")) {
        resetHeaderShareMenuPosition();
        return;
      }
      if (!isMobileShareLayout()) {
        resetHeaderShareMenuPosition();
        return;
      }
      var gap = 6;
      var bounds = getShareMenuViewportBounds();
      var btn = headerBtn.getBoundingClientRect();
      var maxMenuHeight = Math.min(window.innerHeight * 0.8, bounds.height);

      headerMenu.style.position = "fixed";
      headerMenu.style.right = "auto";
      headerMenu.style.bottom = "auto";
      headerMenu.style.maxWidth = Math.floor(bounds.width) + "px";
      headerMenu.style.maxHeight = Math.floor(maxMenuHeight) + "px";
      headerMenu.style.overflowY = "auto";

      var left = Math.max(bounds.left, Math.min(btn.left, bounds.right - bounds.width));
      headerMenu.style.left = Math.round(left) + "px";
      headerMenu.style.top = Math.round(btn.bottom + gap) + "px";

      var menuWidth = headerMenu.offsetWidth;
      left = Math.max(bounds.left, Math.min(left, bounds.right - menuWidth));
      headerMenu.style.left = Math.round(left) + "px";

      var menuHeight = Math.min(headerMenu.scrollHeight, maxMenuHeight);
      var top = btn.bottom + gap;
      if (top + menuHeight > bounds.bottom) {
        top = btn.top - gap - menuHeight;
        if (top < bounds.top) {
          top = bounds.top;
          headerMenu.style.maxHeight = Math.floor(bounds.bottom - bounds.top) + "px";
        }
      }
      headerMenu.style.top = Math.round(Math.max(bounds.top, top)) + "px";
    }

    function appendHeaderMenuItem(label, attrs) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "share-header-menu-item topbar-menu-item";
      btn.setAttribute("role", "menuitem");
      btn.textContent = label;
      Object.keys(attrs).forEach(function (key) {
        btn.dataset[key] = attrs[key];
      });
      headerMenu.appendChild(btn);
      return btn;
    }

    function rebuildHeaderShareMenu() {
      if (!headerMenu) return;
      headerMenu.innerHTML = "";
      var mode = resolveShareMode();
      if (mode.mode === "snapshot" && isEditorPage()) {
        appendHeaderMenuItem("Share diagram image", { editorShareAction: "snapshot" });
        appendHeaderMenuItem("Copy diagram image", { editorShareAction: "copy-image" });
      } else {
        var meta = buildPlatformMeta();
        for (var i = 0; i < meta.length; i++) {
          var p = meta[i];
          if (p.external) appendHeaderMenuItem(p.label, { sharePlatform: p.id });
          else appendHeaderMenuItem(p.label, { shareAction: p.id });
        }
      }
      var sep = document.createElement("div");
      sep.className = "topbar-menu-sep";
      sep.setAttribute("role", "separator");
      sep.setAttribute("aria-hidden", "true");
      headerMenu.appendChild(sep);
      appendHeaderMenuItem("Close", { shareHeaderClose: "1" });
    }

    function ensureHeaderShare() {
      if (headerHost) return headerHost;
      var anchorInfo = findHeaderShareAnchor();
      if (!anchorInfo) return null;

      headerHost = document.createElement("div");
      headerHost.className = "share-header-host";
      headerHost.id = "shareHeaderHost";

      headerBtn = document.createElement("button");
      headerBtn.type = "button";
      headerBtn.id = "shareHeaderBtn";
      headerBtn.className = "share-header-btn icon-btn";
      headerBtn.setAttribute("aria-label", "Share");
      headerBtn.setAttribute("title", "Share");
      headerBtn.setAttribute("aria-haspopup", "menu");
      headerBtn.setAttribute("aria-expanded", "false");
      headerBtn.setAttribute("aria-controls", "shareHeaderMenu");
      headerBtn.innerHTML =
        '<span class="icon-svg" aria-hidden="true">' + (ICONS.native || "") + "</span>";

      headerMenu = document.createElement("div");
      headerMenu.id = "shareHeaderMenu";
      headerMenu.className = "share-header-menu topbar-more-menu";
      headerMenu.setAttribute("role", "menu");
      headerMenu.hidden = true;
      rebuildHeaderShareMenu();

      headerHost.appendChild(headerBtn);
      headerHost.appendChild(headerMenu);

      if (anchorInfo.kind === "editor") {
        anchorInfo.el.appendChild(headerHost);
        anchorInfo.el.hidden = false;
      } else {
        var toggle = anchorInfo.el.querySelector(".nav-menu-toggle");
        if (toggle) anchorInfo.el.insertBefore(headerHost, toggle);
        else anchorInfo.el.appendChild(headerHost);
      }

      headerBtn.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
      });
      headerBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = !headerMenu.classList.contains("open");
        if (open) {
          var topbarMenu = document.getElementById("topbarMoreMenu");
          if (topbarMenu && topbarMenu.classList.contains("open")) {
            topbarMenu.classList.remove("open");
            topbarMenu.hidden = true;
            var moreBtn = document.getElementById("topbarMoreBtn");
            if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
          }
          headerMenu.classList.add("open");
          headerMenu.hidden = false;
          headerBtn.setAttribute("aria-expanded", "true");
          requestAnimationFrame(function () {
            positionHeaderShareMenu();
            requestAnimationFrame(positionHeaderShareMenu);
          });
        } else {
          closeHeaderShareMenu();
        }
      });

      headerMenu.addEventListener("click", onHeaderShareMenuClick);

      document.addEventListener("pointerdown", function (e) {
        if (!headerMenu.classList.contains("open")) return;
        if (e.target.closest("#shareHeaderBtn") || e.target.closest("#shareHeaderMenu")) return;
        closeHeaderShareMenu();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && headerMenu.classList.contains("open")) closeHeaderShareMenu();
      });
      MOBILE_MQ.addEventListener("change", syncShareLayout);
      window.addEventListener("resize", positionHeaderShareMenu);
      addTeardown(function () {
        MOBILE_MQ.removeEventListener("change", syncShareLayout);
        window.removeEventListener("resize", positionHeaderShareMenu);
      });

      return headerHost;
    }

    async function onHeaderShareMenuClick(e) {
      var closeItem = e.target.closest("[data-share-header-close]");
      if (closeItem) {
        e.preventDefault();
        closeHeaderShareMenu();
        return;
      }
      var editorItem = e.target.closest("[data-editor-share-action]");
      if (editorItem) {
        e.preventDefault();
        e.stopPropagation();
        var editorAction = editorItem.dataset.editorShareAction;
        if (editorAction === "snapshot") await runSnapshotShare("native");
        else if (editorAction === "copy-image") {
          var hooks = window.MapDiagramShare;
          if (hooks && typeof hooks.copyImageToClipboard === "function") {
            await hooks.copyImageToClipboard();
          } else {
            var copyBtn = document.getElementById("copyDiagramImageBtn");
            if (copyBtn) copyBtn.click();
          }
        }
        closeHeaderShareMenu();
        return;
      }
      await onDockClick(e);
      closeHeaderShareMenu();
    }

    function syncShareLayout() {
      var mobile = isMobileShareLayout();
      var editor = isEditorPage();
      if (mobile) {
        ensureHeaderShare();
        if (headerHost) headerHost.hidden = false;
        dock.classList.add("share-dock--layout-hidden");
        dock.style.display = "none";
        setExpanded(false);
      } else {
        closeHeaderShareMenu();
        if (headerHost) headerHost.hidden = true;
        if (editor) {
          dock.classList.add("share-dock--layout-hidden");
          dock.style.display = "none";
        } else {
          dock.classList.remove("share-dock--layout-hidden");
          dock.style.display = "";
        }
      }
    }

    function onLocationChange() {
      applyShareMode();
    }
    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    patchHistory(onLocationChange);
    addTeardown(function () {
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
      unpatchHistory();
    });

    var titleNode = document.querySelector("title");
    if (titleNode && typeof MutationObserver !== "undefined") {
      var titleMo = new MutationObserver(function () {
        applyShareMode();
      });
      titleMo.observe(titleNode, { childList: true, subtree: true, characterData: true });
      addTeardown(function () {
        titleMo.disconnect();
      });
    }

    async function copyLink(url) {
      url = url || window.location.href;
      var ok = false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(url);
          ok = true;
        } else {
          var ta = document.createElement("textarea");
          ta.value = url;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          ta.style.pointerEvents = "none";
          document.body.appendChild(ta);
          ta.select();
          try {
            ok = document.execCommand("copy");
          } catch (_) {
            ok = false;
          }
          ta.remove();
        }
      } catch (_) {
        ok = false;
      }
      showToast(ok ? "Link copied" : "Could not copy link");
    }

    async function nativeShareLink(url, title) {
      try {
        await navigator.share({ title: title || document.title, url: url || window.location.href });
      } catch (err) {
        if (err && err.name !== "AbortError") showToast("Share unavailable");
      }
    }

    var snapshotBusy = false;

    async function runSnapshotShare(platformId) {
      var hooks = window.MapDiagramShare;
      if (!hooks || typeof hooks.shareSnapshot !== "function") {
        showToast("Share image unavailable");
        return;
      }
      if (snapshotBusy) return;
      snapshotBusy = true;
      dock.classList.add("is-sharing");
      if (headerHost) headerHost.classList.add("is-sharing");
      try {
        await hooks.shareSnapshot({ platform: platformId || "" });
      } catch (err) {
        if (err && err.name !== "AbortError") showToast("Could not share image");
      } finally {
        snapshotBusy = false;
        dock.classList.remove("is-sharing");
        if (headerHost) headerHost.classList.remove("is-sharing");
      }
    }

    async function onDockClick(e) {
      var platformBtn = e.target.closest("[data-share-platform]");
      var actionBtn = e.target.closest("[data-share-action]");
      if (!platformBtn && !actionBtn) return;
      e.preventDefault();
      e.stopPropagation();

      var mode = resolveShareMode();
      var platformId = platformBtn ? platformBtn.dataset.sharePlatform : "";
      var action = actionBtn ? actionBtn.dataset.shareAction : "";

      if (mode.mode === "snapshot") {
        await runSnapshotShare(platformId || action);
        return;
      }

      if (actionBtn) {
        if (action === "copy") await copyLink(mode.url);
        else if (action === "native") await nativeShareLink(mode.url, mode.title);
        return;
      }
      if (platformBtn && platformId) {
        var href = externalHref(platformId, mode.url, mode.title);
        window.open(href, "_blank", "noopener,noreferrer");
      }
    }

    dock.addEventListener("click", onDockClick);
    addTeardown(function () {
      dock.removeEventListener("click", onDockClick);
    });

    var CANVAS_SELECTOR = "#workspace, .workspace, #viewport, canvas";
    var activePid = null;
    var dragStart = null;

    function onPointerDown(e) {
      var t = e.target;
      if (!t || typeof t.closest !== "function") return;
      if (t.closest("#shareDock") || t.closest("#shareDockToast")) return;
      if (!t.closest(CANVAS_SELECTOR)) return;
      activePid = e.pointerId;
      dragStart = { x: e.clientX, y: e.clientY };
    }

    function onPointerMove(e) {
      if (activePid == null || e.pointerId !== activePid || !dragStart) return;
      var dx = e.clientX - dragStart.x;
      var dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 8 && !dock.classList.contains("is-hidden-drag")) {
        dock.classList.add("is-hidden-drag");
      }
    }

    function endDrag(e) {
      if (activePid == null) return;
      if (e && e.pointerId !== activePid) return;
      activePid = null;
      dragStart = null;
      dock.classList.remove("is-hidden-drag");
    }

    function onBlur() {
      endDrag(null);
    }

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    document.addEventListener("pointerup", endDrag, { capture: true, passive: true });
    document.addEventListener("pointercancel", endDrag, { capture: true, passive: true });
    window.addEventListener("blur", onBlur);
    addTeardown(function () {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.removeEventListener("pointerup", endDrag, { capture: true });
      document.removeEventListener("pointercancel", endDrag, { capture: true });
      window.removeEventListener("blur", onBlur);
    });

    syncShareLayout();
    if (isMobileShareLayout() && !headerHost) {
      var headerRetry = 0;
      var headerRetryTimer = window.setInterval(function () {
        headerRetry += 1;
        if (headerHost || !isMobileShareLayout() || headerRetry > 50) {
          window.clearInterval(headerRetryTimer);
          return;
        }
        if (findHeaderShareAnchor()) syncShareLayout();
      }, 120);
      addTeardown(function () {
        window.clearInterval(headerRetryTimer);
      });
    }

    window.ShareDock = {
      show: function () {
        setExpanded(true);
      },
      hide: function () {
        setExpanded(false);
        closeHeaderShareMenu();
      },
      toggle: function () {
        setExpanded(dock.classList.contains("is-collapsed"));
      },
      refresh: applyShareMode,
      syncLayout: syncShareLayout,
      destroy: function () {
        runTeardown();
        dock.remove();
        toast.remove();
        if (headerHost && headerHost.parentNode) headerHost.parentNode.removeChild(headerHost);
        headerHost = null;
        headerBtn = null;
        headerMenu = null;
        if (injectedStylesheetEl && injectedStylesheetEl.parentNode) {
          injectedStylesheetEl.parentNode.removeChild(injectedStylesheetEl);
        }
        injectedStylesheetEl = null;
        delete window.__shareDockMounted;
        delete window.ShareDock;
      },
      copy: function () {
        var m = resolveShareMode();
        if (m.mode === "snapshot") return runSnapshotShare("copy");
        return copyLink(m.url);
      },
      native: function () {
        var m = resolveShareMode();
        if (m.mode === "snapshot") return runSnapshotShare("native");
        return nativeShareLink(m.url, m.title);
      },
      toast: showToast
    };
  });
})();
