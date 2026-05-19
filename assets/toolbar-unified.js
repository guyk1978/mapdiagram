/**
 * Unified toolbar: DOM assembly, Insert menu, Phosphor icons.
 */
(function () {
  const PHOSPHOR_ICONS = {
    topbarInsertBtn: "plus",
    addNodeBtn: "plus",
    undoBtn: "arrow-counter-clockwise",
    redoBtn: "arrow-clockwise",
    duplicateNodesToolbarBtn: "copy",
    stickyMultiSelectBtn: "selection",
    topbarDeleteConnBtn: "trash",
    topbarBranchConnBtn: "git-branch",
    themeToggleBtn: "sun",
    fitViewBtn: "arrows-out",
    refreshCanvasBtn: "arrows-clockwise",
    improveFlowchartLayoutBtn: "layout",
    autoLayoutBtn: "squares-four",
    alignNodesLeftBtn: "align-left",
    alignNodesHCenterBtn: "align-center-horizontal",
    alignNodesTopBtn: "align-top",
    alignNodesVCenterBtn: "align-center-vertical",
    distributeNodesHBtn: "columns",
    distributeNodesVBtn: "rows",
    publishFlowchartBtn: "link",
    exportBtn: "download-simple",
    exportPngBtn: "image",
    exportSvgBtn: "file-svg",
    importBtn: "upload-simple",
    zoomOutBtn: "minus",
    zoomInBtn: "plus",
    topbarMoreBtn: "dots-three",
    toggleDesktopLeftBtn: "sidebar",
    toggleDesktopRightBtn: "sidebar-simple",
    toggleDesktopBothBtn: "corners-out",
    toggleLeftPanelBtn: "list",
    toggleRightPanelBtn: "gear",
  };

  function applyPhosphorIcon(el, iconName) {
    if (!el || !iconName) return;
    el.innerHTML = `<i class="ph ph-${iconName}" aria-hidden="true"></i>`;
  }

  function applyToolbarPhosphorIcons() {
    for (const [id, icon] of Object.entries(PHOSPHOR_ICONS)) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (id === "themeToggleBtn") {
        el.innerHTML =
          '<i class="ph ph-sun icon-theme-sun" aria-hidden="true"></i><i class="ph ph-moon icon-theme-moon" aria-hidden="true"></i>';
        continue;
      }
      applyPhosphorIcon(el, icon);
    }
    const home = document.querySelector(".topbar-home-btn");
    if (home) applyPhosphorIcon(home, "house");
  }

  function ensureInsertMenu() {
    if (document.getElementById("topbarInsertBtn")) return;
    const nav = document.querySelector(".topbar-unified .tb-group.tb-nav");
    if (!nav) return;
    const wrap = document.createElement("div");
    wrap.className = "tb-insert-wrap";
    wrap.innerHTML = `
      <button type="button" id="topbarInsertBtn" class="tb-insert-btn" aria-expanded="false" aria-haspopup="menu" aria-controls="topbarInsertMenu">
        <i class="ph ph-plus" aria-hidden="true"></i>
        <span class="tb-insert-label">Insert</span>
      </button>
      <div id="topbarInsertMenu" class="tb-insert-menu" role="menu" hidden>
        <button type="button" class="tb-insert-item" id="insertNewDiagramBtn" role="menuitem"><i class="ph ph-tree-structure" aria-hidden="true"></i> New Diagram</button>
        <button type="button" class="tb-insert-item" id="insertNewProjectBtn" role="menuitem"><i class="ph ph-folder-plus" aria-hidden="true"></i> New Project</button>
        <button type="button" class="tb-insert-item" id="insertNewNodeBtn" role="menuitem"><i class="ph ph-squares-four" aria-hidden="true"></i> New Node</button>
      </div>`;
    const panel = document.querySelector(".topbar-unified-panel");
    const row = document.querySelector(".topbar-unified .topbar-minimal-row");
    if (row && nav.nextSibling) {
      row.insertBefore(wrap, nav.nextSibling);
    } else if (panel) {
      panel.insertBefore(wrap, panel.querySelector(".topbar-minimal-end"));
    }
  }

  function mountSavedIndicatorInNav() {
    const saved = document.getElementById("savedIndicator");
    const nav = document.querySelector(".topbar-unified .tb-group.tb-nav");
    if (saved && nav && !nav.contains(saved)) {
      nav.appendChild(saved);
    }
  }

  function mountOffscreenToolsInPanel() {
    const offscreen = document.getElementById("topbarOffscreenTools");
    const row = document.querySelector(".topbar-unified .topbar-minimal-row");
    const panel = document.querySelector(".topbar-unified-panel");
    if (!offscreen || !row || !panel) return;
    if (offscreen.parentElement === row) return;
    const end = row.querySelector(".topbar-minimal-end");
    if (end && end.nextSibling !== offscreen) {
      row.insertBefore(offscreen, end.nextSibling);
    }
  }

  function initInsertMenu() {
    ensureInsertMenu();
    const btn = document.getElementById("topbarInsertBtn");
    const menu = document.getElementById("topbarInsertMenu");
    if (!btn || !menu) return;

    const close = () => {
      menu.classList.remove("open");
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !menu.classList.contains("open");
      if (open) {
        menu.classList.add("open");
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      } else {
        close();
      }
    });

    document.getElementById("insertNewDiagramBtn")?.addEventListener("click", () => {
      close();
      const nameEl = document.getElementById("projectName");
      if (nameEl) nameEl.value = "Untitled Diagram";
      document.getElementById("newProjectBtn")?.click();
    });

    document.getElementById("insertNewProjectBtn")?.addEventListener("click", () => {
      close();
      document.getElementById("newProjectBtn")?.click();
    });

    document.getElementById("insertNewNodeBtn")?.addEventListener("click", () => {
      close();
      document.getElementById("addNodeBtn")?.click();
    });

    document.addEventListener("pointerdown", (e) => {
      if (!menu.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function initUnifiedToolbar() {
    if (!document.querySelector(".topbar-unified")) return;
    mountSavedIndicatorInNav();
    mountOffscreenToolsInPanel();
    ensureInsertMenu();
    applyToolbarPhosphorIcons();
    initInsertMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUnifiedToolbar);
  } else {
    initUnifiedToolbar();
  }

  window.MapDiagramUnifiedToolbar = { applyToolbarPhosphorIcons, initInsertMenu, initUnifiedToolbar };
})();
