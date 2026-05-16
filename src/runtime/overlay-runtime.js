/**
 * Focus modal + portal lifecycle (Phase 6).
 */

const MD_FOCUS_MODAL_READY_CLASS = "md-focus-modal-ready";
const MD_FOCUS_MODAL_MEASURING_CLASS = "md-focus-modal-measuring";
const MD_FOCUS_MODAL_INSTANT_CLASS = "md-focus-modal-instant";
const MD_FORBIDDEN_PORTAL_ANCESTORS = [
  "#viewport",
  "#workspace",
  "#nodes",
  "#connections",
  "#canvas-underlays",
  "#semantic-overlays",
];

export function createOverlayRuntime(ctx, deps) {
  const { runtime, dom, emit } = ctx;
  const registry = new Map();

  function mdDebugWarn(code, detail) {
    if (typeof deps.mdDebugWarn === "function") deps.mdDebugWarn(code, detail);
  }

  function getFocusOverlay() {
    return dom.focusOverlay || document.getElementById("focusOverlay");
  }

  function getModalRoot() {
    return dom.modalRoot || document.getElementById("modal-root");
  }

  function getFocusModalEl() {
    return document.getElementById("focusModal") || dom.focusModal;
  }

  function mountIntoModalRoot(el) {
    const modalRoot = getModalRoot();
    if (!el || !modalRoot) return;
    if (el.parentElement === modalRoot) return;
    for (const sel of MD_FORBIDDEN_PORTAL_ANCESTORS) {
      if (el.closest(sel)) {
        mdDebugWarn("portal-forbidden-ancestor", { sel, id: el.id });
        break;
      }
    }
    modalRoot.appendChild(el);
  }

  function ensureFocusOverlayPortal() {
    const focusOverlay = getFocusOverlay();
    if (!focusOverlay) return;
    mountIntoModalRoot(focusOverlay);
  }

  function isFocusModalDomValid() {
    const focusOverlay = getFocusOverlay();
    const modalEl = getFocusModalEl();
    return !!(focusOverlay && modalEl && focusOverlay.contains(modalEl));
  }

  function repairFocusModalDom() {
    const focusOverlay = getFocusOverlay();
    const modalEl = getFocusModalEl();
    if (!focusOverlay || !modalEl) return false;
    if (!focusOverlay.contains(modalEl)) focusOverlay.appendChild(modalEl);
    return true;
  }

  function clearFocusModalRescueClasses() {
    const modalEl = getFocusModalEl();
    const focusOverlay = getFocusOverlay();
    modalEl?.classList.remove(MD_FOCUS_MODAL_READY_CLASS);
    focusOverlay?.classList.remove(MD_FOCUS_MODAL_MEASURING_CLASS);
    focusOverlay?.classList.remove(MD_FOCUS_MODAL_INSTANT_CLASS);
  }

  function isFocusModalLayoutValid() {
    const modalEl = getFocusModalEl();
    const focusOverlay = getFocusOverlay();
    if (!modalEl || !focusOverlay) return false;
    if (!isFocusModalDomValid()) return false;
    const r = modalEl.getBoundingClientRect();
    const st = getComputedStyle(modalEl);
    if (st.display === "none" || st.visibility === "hidden") return false;
    return r.width >= 40 && r.height >= 40;
  }

  function teardownFocusModalUi() {
    const focusOverlay = getFocusOverlay();
    const modalRoot = getModalRoot();
    if (runtime.focusModalWatchdog) {
      clearTimeout(runtime.focusModalWatchdog);
      runtime.focusModalWatchdog = null;
    }
    runtime.focusNodeId = null;
    runtime.focusModalHistoryPrimed = false;
    runtime.focusClosing = false;
    clearFocusModalRescueClasses();
    focusOverlay?.classList.remove("open");
    focusOverlay?.setAttribute("aria-hidden", "true");
    if (modalRoot) modalRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("md-focus-modal-open");
    emit("overlayClosed", { id: "focus" });
  }

  function syncFocusModalOrphanGuard() {
    const focusOverlay = getFocusOverlay();
    if (!focusOverlay?.classList.contains("open")) return;
    const getNodeById = deps.getNodeById;
    if (!runtime.focusNodeId || !getNodeById?.(runtime.focusNodeId) || !isFocusModalDomValid()) {
      teardownFocusModalUi();
    }
  }

  function scheduleFocusModalVisibilityWatch() {
    const focusOverlay = getFocusOverlay();
    if (runtime.focusModalWatchdog) clearTimeout(runtime.focusModalWatchdog);
    runtime.focusModalWatchdog = setTimeout(() => {
      runtime.focusModalWatchdog = null;
      if (!focusOverlay?.classList.contains("open")) return;
      if (!isFocusModalLayoutValid()) {
        teardownFocusModalUi();
        deps.showToast?.("Extended editor could not be shown.", "warn");
      }
    }, 450);
  }

  function openFocusModal(nodeId) {
    const focusOverlay = getFocusOverlay();
    const modalRoot = getModalRoot();
    const node = deps.getNodeById?.(nodeId);
    if (!node || !focusOverlay) return false;
    if (focusOverlay.classList.contains("open") && runtime.focusNodeId === nodeId) return true;
    if (focusOverlay.classList.contains("open")) teardownFocusModalUi();

    try {
      ensureFocusOverlayPortal();
      if (!repairFocusModalDom()) throw new Error("focus modal DOM repair failed");
      deps.closeImportDiffOverlay?.();
      deps.closeCommandPalette?.();
      deps.closeKeyboardHelpOverlay?.();
      deps.resetNodeInspectorGestureState?.();
      deps.normalizeNode?.(node);
      deps.setNodeInspectorTab?.("content");
      deps.populateFocusModalFields?.(node);

      const modalEl = getFocusModalEl();
      if (!modalEl) throw new Error("focusModal element missing");

      clearFocusModalRescueClasses();
      focusOverlay.classList.add(MD_FOCUS_MODAL_MEASURING_CLASS);
      modalEl.classList.add(MD_FOCUS_MODAL_READY_CLASS);
      void modalEl.offsetHeight;
      if (!isFocusModalLayoutValid()) throw new Error("focus modal failed pre-open layout check");

      focusOverlay.classList.remove(MD_FOCUS_MODAL_MEASURING_CLASS);
      runtime.focusNodeId = nodeId;
      runtime.focusModalHistoryPrimed = false;
      focusOverlay.classList.add(MD_FOCUS_MODAL_INSTANT_CLASS, "open");
      focusOverlay.setAttribute("aria-hidden", "false");
      if (modalRoot) modalRoot.setAttribute("aria-hidden", "false");
      document.body.classList.add("md-focus-modal-open");

      requestAnimationFrame(() => {
        if (!focusOverlay.classList.contains("open")) return;
        if (!isFocusModalLayoutValid()) {
          teardownFocusModalUi();
          deps.showToast?.("Extended editor could not be shown.", "warn");
          return;
        }
        setTimeout(() => focusOverlay?.classList.remove(MD_FOCUS_MODAL_INSTANT_CLASS), 280);
      });
      scheduleFocusModalVisibilityWatch();
      setTimeout(() => document.getElementById("nodeInspTitle")?.focus(), 0);
      emit("overlayOpened", { id: "focus", nodeId });
      return true;
    } catch (err) {
      teardownFocusModalUi();
      deps.showToast?.("Could not open extended editor.", "warn");
      return false;
    }
  }

  function closeFocusModal() {
    const focusOverlay = getFocusOverlay();
    const overlayOpen = !!(focusOverlay && focusOverlay.classList.contains("open"));
    if (!overlayOpen && !runtime.focusNodeId) return;
    if (runtime.focusClosing && overlayOpen) return;

    if (runtime.focusNodeId) {
      deps.resetNodeInspectorGestureState?.();
      deps.syncNodeInspectorToModel?.();
      const pwd = document.getElementById("nodeInspPassword");
      if (pwd) pwd.value = "";
    }
    runtime.focusClosing = true;
    teardownFocusModalUi();
    deps.closeCommandPalette?.();
    deps.closeKeyboardHelpOverlay?.();
    setTimeout(() => {
      runtime.focusClosing = false;
    }, 220);
  }

  function isFocusOpen() {
    return !!getFocusOverlay()?.classList.contains("open");
  }

  function registerOverlay(spec) {
    if (!spec?.id) return () => {};
    registry.set(spec.id, spec);
    return () => registry.delete(spec.id);
  }

  function closeAllOverlays() {
    teardownFocusModalUi();
    for (const spec of registry.values()) spec.close?.();
  }

  function handleEscape(event) {
    if (event?.key !== "Escape") return false;
    if (isFocusOpen() || runtime.focusNodeId) {
      closeFocusModal();
      return true;
    }
    for (const spec of registry.values()) {
      if (spec.isOpen?.() && spec.onEscape?.(event) !== false) {
        spec.close?.();
        return true;
      }
    }
    return false;
  }

  return {
    mountIntoModalRoot,
    ensureFocusOverlayPortal,
    openFocusModal,
    closeFocusModal,
    teardownFocusModalUi,
    syncFocusModalOrphanGuard,
    isFocusOpen,
    registerOverlay,
    closeAllOverlays,
    handleEscape,
  };
}
