/**
 * Unified toolbar: Insert menu, layout helpers, inline SVG icon repair.
 */
(function () {
  const STROKE =
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

  function svg(inner) {
    return `<span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg></span>`;
  }

  function svgOnAccent(inner) {
    return `<span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner.replace(/currentColor/g, "#f8faff")}</svg></span>`;
  }

  const TOOLBAR_ICONS = {
    topbarMoreBtn: svg(`<circle cx="6" cy="12" r="1.75" fill="currentColor"/><circle cx="12" cy="12" r="1.75" fill="currentColor"/><circle cx="18" cy="12" r="1.75" fill="currentColor"/>`),
    topbarHomeBtn: svg(`<path d="M4 11 12 5l8 6v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9Z" ${STROKE}/>`),
    toggleLeftPanelBtn: svg(`<path d="M5 7h14M5 12h14M5 17h14" ${STROKE}/>`),
    toggleDesktopLeftBtn: svg(`<path d="M4 5v14" ${STROKE}/><rect x="7" y="5" width="13" height="14" rx="1.5" ${STROKE}/>`),
    toggleDesktopRightBtn: svg(`<rect x="4" y="5" width="13" height="14" rx="1.5" ${STROKE}/><path d="M20 5v14" ${STROKE}/>`),
    toggleDesktopBothBtn: svg(`<path d="M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4" ${STROKE}/>`),
    toggleRightPanelBtn: svg(`<circle cx="12" cy="12" r="3.5" ${STROKE}/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.05-1.55 1.7 1.7 0 0 0-1.87.41l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.05 1.7 1.7 0 0 0-.41-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H12a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V12c0 .69-.41 1.31-1.05 1.55z" ${STROKE}/>`),
    undoBtn: svg(`<path d="M9 14 4 9l5-5" ${STROKE}/><path d="M20 15v-2a4 4 0 0 0-4-4H4" ${STROKE}/>`),
    redoBtn: svg(`<path d="m15 14 5-5-5-5" ${STROKE}/><path d="M4 15v-2a4 4 0 0 1 4-4h12" ${STROKE}/>`),
    duplicateNodesToolbarBtn: svg(`<rect x="8" y="8" width="11" height="11" rx="1.5" ${STROKE}/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" ${STROKE}/>`),
    stickyMultiSelectBtn: svg(`<rect x="5" y="7" width="10" height="10" rx="1.5" ${STROKE}/><rect x="9" y="5" width="10" height="10" rx="1.5" ${STROKE} opacity=".85"/>`),
    topbarDeleteConnBtn: svg(`<path d="M4 7h16M10 11v6M14 11v6M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1v2" ${STROKE}/><path d="M8 7l1 14a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9l1-14" ${STROKE}/>`),
    topbarBranchConnBtn: svg(`<path d="M6 6v12M6 12h8a3 3 0 0 1 3 3v3M14 12h4a2 2 0 0 1 2 2v4" ${STROKE}/><path d="M18 6v4M16 8h4" ${STROKE}/>`),
    fitViewBtn: svg(`<path d="M9 3H5v4M15 3h4v4M3 9V5h4M21 9V5h-4M9 21H5v-4M15 21h4v-4M3 15v4h4M21 15v4h-4" ${STROKE}/>`),
    refreshCanvasBtn: svg(`<path d="M20 12a8 8 0 1 1-2.34-5.66" ${STROKE}/><path d="M20 4v6h-6" ${STROKE}/>`),
    improveFlowchartLayoutBtn: svg(`<path d="M4 6h6v4H4V6zm10 0h6v4h-6V6zM4 14h6v4H4v-4zm10 0h6v4h-6v-4z" ${STROKE}/>`),
    topbarInsertBtn: svgOnAccent(`<path d="M12 5v14M5 12h14" ${STROKE}/>`),
  };

  const THEME_TOGGLE_HTML =
    '<span class="icon-svg icon-theme-sun" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>' +
    '<span class="icon-svg icon-theme-moon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 6.5 6.5 0 1 0 21 14.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span>';

  const INSERT_ICONS = {
    plus: svgOnAccent(`<path d="M12 5v14M5 12h14" ${STROKE}/>`),
    diagram: svg(`<path d="M4 6h6v4H4V6zm10 0h6v4h-6V6zM4 14h6v4H4v-4zm10 0h6v4h-6v-4z" ${STROKE}/>`),
    project: svg(`<path d="M4 7h16v12H4V7z" ${STROKE}/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1v2" ${STROKE}/>`),
    node: svg(`<rect x="5" y="5" width="8" height="8" rx="1.5" ${STROKE}/><rect x="11" y="11" width="8" height="8" rx="1.5" ${STROKE}/>`),
  };

  function iconSlotBroken(el) {
    if (!el) return false;
    if (el.querySelector(".ph, i.ph")) return true;
    if (el.classList.contains("icon-btn") && !el.querySelector(".icon-svg svg")) return true;
    const home = el.classList?.contains("topbar-home-btn");
    if (home && !el.querySelector("svg")) return true;
    return false;
  }

  function repairToolbarIcons() {
    const root = document.querySelector(".topbar-unified");
    if (!root) return;

    root.querySelectorAll(".icon-btn, .topbar-home-btn").forEach((btn) => {
      if (btn.id === "themeToggleBtn") {
        if (!btn.querySelector(".icon-theme-sun")) btn.innerHTML = THEME_TOGGLE_HTML;
        return;
      }
      if (!iconSlotBroken(btn)) return;
      const html = TOOLBAR_ICONS[btn.id];
      if (html) btn.innerHTML = html;
    });

    const insertBtn = document.getElementById("topbarInsertBtn");
    if (insertBtn && iconSlotBroken(insertBtn)) {
      insertBtn.innerHTML =
        INSERT_ICONS.plus + '<span class="tb-insert-label">Insert</span>';
    }

    document.querySelectorAll(".tb-insert-item").forEach((item) => {
      if (item.querySelector(".icon-svg svg")) return;
      if (item.id === "insertNewDiagramBtn") item.insertAdjacentHTML("afterbegin", INSERT_ICONS.diagram);
      else if (item.id === "insertNewProjectBtn") item.insertAdjacentHTML("afterbegin", INSERT_ICONS.project);
      else if (item.id === "insertNewNodeBtn") item.insertAdjacentHTML("afterbegin", INSERT_ICONS.node);
    });
  }

  function ensureInsertMenu() {
    if (document.getElementById("topbarInsertBtn")) return;
    const nav = document.querySelector(".topbar-unified .tb-group.tb-nav");
    if (!nav) return;
    const wrap = document.createElement("div");
    wrap.className = "tb-insert-wrap";
    wrap.innerHTML = `
      <button type="button" id="topbarInsertBtn" class="tb-insert-btn" aria-expanded="false" aria-haspopup="menu" aria-controls="topbarInsertMenu">
        ${INSERT_ICONS.plus}
        <span class="tb-insert-label">Insert</span>
      </button>
      <div id="topbarInsertMenu" class="tb-insert-menu" role="menu" hidden>
        <button type="button" class="tb-insert-item" id="insertNewDiagramBtn" role="menuitem">${INSERT_ICONS.diagram} New Diagram</button>
        <button type="button" class="tb-insert-item" id="insertNewProjectBtn" role="menuitem">${INSERT_ICONS.project} New Project</button>
        <button type="button" class="tb-insert-item" id="insertNewNodeBtn" role="menuitem">${INSERT_ICONS.node} New Node</button>
      </div>`;
    const row = document.querySelector(".topbar-unified .topbar-minimal-row");
    if (row) {
      const end = row.querySelector(".topbar-minimal-end");
      if (end) row.insertBefore(wrap, end);
      else row.appendChild(wrap);
    } else {
      nav.insertAdjacentElement("afterend", wrap);
    }
  }

  function mountSavedIndicatorInNav() {
    const saved = document.getElementById("savedIndicator");
    const nav = document.querySelector(".topbar-unified .tb-group.tb-nav");
    if (saved && nav && !nav.contains(saved)) nav.appendChild(saved);
  }

  function reorderToolbarDom() {
    const row = document.querySelector(".topbar-unified .topbar-minimal-row");
    if (!row) return;
    const nav = row.querySelector(".tb-group.tb-nav");
    const insert = row.querySelector(".tb-insert-wrap");
    const end = row.querySelector(".topbar-minimal-end");
    const user = row.querySelector(".topbar-overflow-leading-wrap");
    if (!nav) return;
    const order = [nav, insert, end, user].filter(Boolean);
    order.forEach((el) => row.appendChild(el));
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
      if (menu.classList.contains("open")) close();
      else {
        menu.classList.add("open");
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
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
      if (typeof window.MapDiagramSpawnNode === "function") {
        window.MapDiagramSpawnNode();
      } else {
        document.getElementById("addNodeBtn")?.click();
      }
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
    reorderToolbarDom();
    mountSavedIndicatorInNav();
    ensureInsertMenu();
    repairToolbarIcons();
    initInsertMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUnifiedToolbar);
  } else {
    initUnifiedToolbar();
  }

  window.MapDiagramUnifiedToolbar = { repairToolbarIcons, initUnifiedToolbar };
})();
