// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";
import { createOverlayRuntime } from "../../src/runtime/overlay-runtime.js";
import { makeCtx, makeRuntime } from "./helpers.js";

function mountFocusDom() {
  const modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  const focusOverlay = document.createElement("div");
  focusOverlay.id = "focusOverlay";
  focusOverlay.setAttribute("aria-hidden", "true");
  const focusModal = document.createElement("div");
  focusModal.id = "focusModal";
  focusModal.style.width = "200px";
  focusModal.style.height = "120px";
  focusModal.style.display = "block";
  focusModal.style.visibility = "visible";
  focusModal.getBoundingClientRect = () =>
    ({ width: 200, height: 120, top: 0, left: 0, right: 200, bottom: 120 }) as DOMRect;
  focusOverlay.appendChild(focusModal);
  document.body.append(modalRoot, focusOverlay);
  modalRoot.appendChild(focusOverlay);
  return { modalRoot, focusOverlay, focusModal };
}

describe("overlay-runtime", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("opens and closes focus modal atomically", () => {
    const dom = mountFocusDom();
    const runtime = makeRuntime();
    const project = { nodes: [{ id: "n1", label: "N" }] };
    const { ctx } = makeCtx(runtime, project as never, dom);
    const overlay = createOverlayRuntime(ctx, {
      getNodeById: (id: string) => (id === "n1" ? { id: "n1", label: "N" } : null),
      populateFocusModalFields: () => {},
      normalizeNode: () => {},
      setNodeInspectorTab: () => {},
    });

    overlay.ensureFocusOverlayPortal();
    expect(dom.focusOverlay.parentElement?.id).toBe("modal-root");

    const opened = overlay.openFocusModal("n1");
    expect(opened).toBe(true);
    expect(dom.focusOverlay.classList.contains("open")).toBe(true);
    expect(runtime.focusNodeId).toBe("n1");

    overlay.closeFocusModal();
    expect(dom.focusOverlay.classList.contains("open")).toBe(false);
    expect(runtime.focusNodeId).toBeNull();
  });

  it("teardown removes orphan open state when focusNodeId cleared", () => {
    const dom = mountFocusDom();
    const runtime = makeRuntime();
    const { ctx } = makeCtx(runtime, { nodes: [{ id: "n1" }] } as never, dom);
    const overlay = createOverlayRuntime(ctx, {
      getNodeById: () => ({ id: "n1" }),
      populateFocusModalFields: () => {},
    });

    dom.focusOverlay.classList.add("open");
    runtime.focusNodeId = null;
    overlay.syncFocusModalOrphanGuard();
    expect(dom.focusOverlay.classList.contains("open")).toBe(false);
  });

  it("handleEscape closes focus overlay", () => {
    const dom = mountFocusDom();
    const runtime = makeRuntime();
    const { ctx } = makeCtx(runtime, { nodes: [{ id: "n1" }] } as never, dom);
    const overlay = createOverlayRuntime(ctx, {
      getNodeById: () => ({ id: "n1" }),
      populateFocusModalFields: () => {},
      normalizeNode: () => {},
      setNodeInspectorTab: () => {},
    });
    overlay.openFocusModal("n1");
    const ev = new KeyboardEvent("keydown", { key: "Escape" });
    expect(overlay.handleEscape(ev)).toBe(true);
    expect(overlay.isFocusOpen()).toBe(false);
  });
});
