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
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="#ffffff" stroke-width="2" fill="none" style="width:14px;height:14px;display:block;flex-shrink:0"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>';
const FEMALE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="#ffffff" stroke-width="2" fill="none" style="width:14px;height:14px;display:block;flex-shrink:0"><circle cx="12" cy="12" r="6"/></svg>';

function ensureCss(doc: Document) {
  if (doc.getElementById("genealogyQuickAddFlowchartStyles")) return;
  const style = doc.createElement("style");
  style.id = "genealogyQuickAddFlowchartStyles";
  style.textContent = `
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action{display:flex;align-items:center;gap:6px;min-width:92px;padding:0 10px}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-label{font-size:10px;font-weight:600;letter-spacing:.02em;line-height:1}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:6px;flex-shrink:0}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-icon--male{background:color-mix(in srgb, #6ea8fe 34%, #1a2744);box-shadow:0 0 8px color-mix(in srgb, #6ea8fe 42%, transparent)}
    .canvas-micro-toolbar__btn--gene.gene-toolbar-action .gene-toolbar-icon--female{background:color-mix(in srgb, #f472b6 34%, #2a1424);box-shadow:0 0 8px color-mix(in srgb, #f472b6 42%, transparent)}
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

function resolveLinkType(host: RuntimeHost, selected: any, role: "male" | "female") {
  const selectedRole = String(selected?.genealogyRole || "");
  const isAdult = selectedRole === "male" || selectedRole === "female";
  const opposite =
    (selectedRole === "male" && role === "female") || (selectedRole === "female" && role === "male");
  if (isAdult && opposite && typeof host.findGenealogySpouse === "function") {
    const spouse = host.findGenealogySpouse(selected.id);
    if (!spouse) return "spouse";
  }
  return "parent-child";
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
  const x = role === "female" ? selected.x + selected.width + 100 : selected.x - w - 100;
  const y = selected.y + Math.max(44, Math.round(selected.height * 0.35));
  const node = host.buildGenealogyNodeFromPreset(preset, x, y);
  p.nodes.push(node);
  host.ensureGenealogyEdge(selected.id, node.id, resolveLinkType(host, selected, role));

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
  spouseBtn.innerHTML = `<span class="gene-toolbar-icon gene-toolbar-icon--female" aria-hidden="true">${FEMALE_ICON}</span><span class="gene-toolbar-label">Add Female</span>`;
  childBtn.innerHTML = `<span class="gene-toolbar-icon gene-toolbar-icon--male" aria-hidden="true">${MALE_ICON}</span><span class="gene-toolbar-label">Add Male</span>`;
  spouseBtn.setAttribute("aria-label", "Add Female Node");
  childBtn.setAttribute("aria-label", "Add Male Node");
  spouseBtn.setAttribute("title", "Add Female Node");
  childBtn.setAttribute("title", "Add Male Node");

  const spouseClone = spouseBtn.cloneNode(true) as HTMLButtonElement;
  const childClone = childBtn.cloneNode(true) as HTMLButtonElement;
  spouseBtn.replaceWith(spouseClone);
  childBtn.replaceWith(childClone);

  spouseClone.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    quickAdd(host, "female");
  });
  childClone.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    quickAdd(host, "male");
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
  host.__mdGenealogyQuickAddInstalled = true;
  return true;
}
