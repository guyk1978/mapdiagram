/**
 * Genealogy quick actions bridge compiled into flowchart-compiler.js.
 * This patches the live floating toolbar in the main app runtime.
 */

type AnyFn = (...args: any[]) => any;

type RuntimeHost = Window & {
  __mdGenealogyQuickAddInstalled?: boolean;
  runtime?: any;
  isGenealogyWorkspaceActive?: AnyFn;
  syncQuickToolbarGenealogyVisibility?: AnyFn & { __mdGenealogyQuickAddPatched?: boolean };
  getProject?: AnyFn;
  getNodeById?: AnyFn;
  getGenealogyPresetByRole?: AnyFn;
  buildGenealogyNodeFromPreset?: AnyFn;
  ensureGenealogyEdge?: AnyFn;
  findGenealogySpouse?: AnyFn;
  pushHistory?: AnyFn;
  markDirty?: AnyFn;
  renderAll?: AnyFn;
  elevateSpawnedNode?: AnyFn;
  flashFcNodeEnter?: AnyFn;
  selectionRuntime?: { selectNode?: AnyFn };
};

const MALE_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0070f3" stroke-width="2" aria-hidden="true" focusable="false" style="display:block;flex-shrink:0"><rect x="2" y="2" width="12" height="12" rx="1" /></svg>';
const FEMALE_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ff007f" stroke-width="2" aria-hidden="true" focusable="false" style="display:block;flex-shrink:0"><circle cx="8" cy="8" r="6" /></svg>';

function ensureCss(doc: Document) {
  if (doc.getElementById("genealogyQuickAddFlowchartStyles")) return;
  const style = doc.createElement("style");
  style.id = "genealogyQuickAddFlowchartStyles";
  style.textContent = `
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action{display:flex;align-items:center;gap:6px;min-width:92px;padding:0 10px}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-label{font-size:10px;font-weight:600;letter-spacing:.02em;line-height:1}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:6px;flex-shrink:0}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-icon--male{background:color-mix(in srgb, #0070f3 20%, #ffffff);box-shadow:0 0 8px color-mix(in srgb, #0070f3 36%, transparent)}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-icon--female{background:color-mix(in srgb, #ff007f 20%, #ffffff);box-shadow:0 0 8px color-mix(in srgb, #ff007f 36%, transparent)}
  `;
  doc.head.appendChild(style);
}

function selectedGenealogyNode(host: RuntimeHost) {
  const rt = host.runtime || {};
  const selectedId =
    rt.selectedNodeId || (rt.selectedNodeIds && rt.selectedNodeIds.size ? [...rt.selectedNodeIds][0] : null);
  if (!selectedId || typeof host.getNodeById !== "function") return null;
  const node = host.getNodeById(selectedId);
  return node && node.genealogyRole ? node : null;
}

function quickAdd(host: RuntimeHost, role: "male" | "female") {
  if (typeof host.isGenealogyWorkspaceActive === "function" && !host.isGenealogyWorkspaceActive()) return;
  const selected = selectedGenealogyNode(host);
  if (!selected) return;
  if (
    typeof host.getProject !== "function" ||
    typeof host.getGenealogyPresetByRole !== "function" ||
    typeof host.buildGenealogyNodeFromPreset !== "function" ||
    typeof host.ensureGenealogyEdge !== "function"
  ) {
    return;
  }

  const preset = host.getGenealogyPresetByRole(role);
  if (!preset) return;
  if (typeof host.pushHistory === "function") host.pushHistory();

  const p = host.getProject();
  const w = Number(preset.width) || 160;
  const gap = 80;
  const x = role === "male" ? selected.x - w - gap : selected.x + selected.width + gap;
  const y = selected.y;
  const node = host.buildGenealogyNodeFromPreset(preset, x, y);
  p.nodes.push(node);
  // Always create a direct partner connection; no child/spouse role guessing.
  host.ensureGenealogyEdge(selected.id, node.id, "spouse");

  host.selectionRuntime?.selectNode?.(node.id);
  host.renderAll?.();
  host.elevateSpawnedNode?.(node.id);
  host.flashFcNodeEnter?.(node.id);
  host.markDirty?.();
}

function decorateToolbar(host: RuntimeHost) {
  const doc = host.document;
  const spouseBtn = doc.getElementById("geneAddSpouseBtn");
  const childBtn = doc.getElementById("geneAddChildBtn");
  if (!spouseBtn || !childBtn) return;

  spouseBtn.classList.add("gene-toolbar-action");
  childBtn.classList.add("gene-toolbar-action");
  spouseBtn.innerHTML = `<span class="gene-toolbar-icon gene-toolbar-icon--male" aria-hidden="true">${MALE_ICON}</span><span class="gene-toolbar-label">Add Male</span>`;
  childBtn.innerHTML = `<span class="gene-toolbar-icon gene-toolbar-icon--female" aria-hidden="true">${FEMALE_ICON}</span><span class="gene-toolbar-label">Add Female</span>`;
  spouseBtn.setAttribute("aria-label", "Add Male (Partner)");
  childBtn.setAttribute("aria-label", "Add Female (Partner)");
  spouseBtn.setAttribute("title", "Add Male (Partner)");
  childBtn.setAttribute("title", "Add Female (Partner)");

  const spouseClone = spouseBtn.cloneNode(true) as HTMLButtonElement;
  const childClone = childBtn.cloneNode(true) as HTMLButtonElement;
  spouseBtn.replaceWith(spouseClone);
  childBtn.replaceWith(childClone);

  spouseClone.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    quickAdd(host, "male");
  });
  childClone.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    quickAdd(host, "female");
  });
}

export function installGenealogyQuickActions(host: RuntimeHost = window as RuntimeHost): boolean {
  if (host.__mdGenealogyQuickAddInstalled) return true;
  if (!host.document || typeof host.syncQuickToolbarGenealogyVisibility !== "function") return false;
  ensureCss(host.document);
  const originalSync = host.syncQuickToolbarGenealogyVisibility;
  if (originalSync.__mdGenealogyQuickAddPatched) {
    host.__mdGenealogyQuickAddInstalled = true;
    return true;
  }
  const wrapped = function wrappedSyncQuickToolbarGenealogyVisibility(this: unknown, ...args: any[]) {
    const out = originalSync.apply(this, args);
    if (host.isGenealogyWorkspaceActive?.()) decorateToolbar(host);
    return out;
  } as AnyFn & { __mdGenealogyQuickAddPatched?: boolean };
  wrapped.__mdGenealogyQuickAddPatched = true;
  host.syncQuickToolbarGenealogyVisibility = wrapped;
  if (host.isGenealogyWorkspaceActive?.()) decorateToolbar(host);
  host.__mdGenealogyQuickAddInstalled = true;
  return true;
}
