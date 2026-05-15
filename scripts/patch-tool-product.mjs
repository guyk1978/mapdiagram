import fs from "node:fs";

const path = "app/tool.html";
let html = fs.readFileSync(path, "utf8");

if (!html.includes("flowchart-product.js")) {
  html = html.replace(
    '<script src="/shared/share-dock.js"></script>',
    '<script src="/shared/share-dock.js"></script>\n<script src="/assets/product-analytics.js"></script>\n<script src="/assets/flowchart-templates-catalog.js"></script>\n<script src="/assets/flowchart-product.js"></script>',
  );
}

if (!html.includes("public-view-mode")) {
  html = html.replace(
    "  .flowchart-mode .conn.fc-conn-back.selected {",
    `  body.public-view-mode .sidebar,
  body.public-view-mode .rightbar,
  body.public-view-mode #topbarOffscreenTools,
  body.public-view-mode .fc-empty-state,
  body.public-view-mode #fcQuickEdit,
  body.public-view-mode #minimapHost,
  body.public-view-mode .topbar-desktop-quick,
  body.public-view-mode #toggleShareDockBtn,
  body.public-view-mode #shareBtn { display: none !important; }
  body.public-view-mode #app { grid-template-columns: 1fr !important; }
  body.public-view-mode .topbar-minimal-start .desktop-sidebar-toggles { display: none; }
  .fc-template-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(8, 10, 18, 0.72);
    display: none; align-items: center; justify-content: center; padding: 20px;
  }
  .fc-template-overlay.open { display: flex; }
  .fc-template-modal {
    width: min(720px, 100%); max-height: 85vh; overflow: auto;
    background: var(--panel-bg, #12182a); border-radius: 16px;
    border: 1px solid rgba(154, 170, 205, 0.2); padding: 20px;
  }
  .fc-template-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .fc-template-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .fc-template-filters button {
    padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(154,170,205,.25);
    background: rgba(20,28,48,.5); color: inherit; cursor: pointer; font-size: 12px;
  }
  .fc-template-filters button.active { border-color: rgba(122,162,255,.6); }
  .fc-template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .fc-template-card {
    text-align: left; padding: 14px; border-radius: 12px;
    border: 1px solid rgba(154,170,205,.2); background: rgba(16,22,38,.6);
    cursor: pointer; color: inherit;
  }
  .fc-template-card strong { display: block; margin-bottom: 4px; }
  .fc-template-card span { font-size: 12px; opacity: 0.8; display: block; }
  .fc-template-card em { font-size: 11px; opacity: 0.55; font-style: normal; }
  #publishFlowchartBtn.publishing { opacity: 0.7; }
  .flowchart-mode .conn.fc-conn-back.selected {`,
  );
}

if (!html.includes("PUBLIC_VIEW_SLUG")) {
  html = html.replace(
    'const SUPABASE_ANON_KEY = window.MAPDIAGRAM_SUPABASE?.anonKey || window.MAPDIAGRAM_SUPABASE_ANON_KEY || "";',
    `const SUPABASE_ANON_KEY = window.MAPDIAGRAM_SUPABASE?.anonKey || window.MAPDIAGRAM_SUPABASE_ANON_KEY || "";
  const PUBLIC_VIEW_SLUG = (() => {
    const s = new URLSearchParams(location.search).get("publicView");
    return s ? String(s).trim().toLowerCase() : null;
  })();
  const MD_EDIT_COUNT_KEY = "md-fc-edit-count";`,
  );
}

if (!html.includes("readOnly:")) {
  html = html.replace(
    "    deskRightCollapsed: false,",
    `    deskRightCollapsed: false,
    readOnly: !!PUBLIC_VIEW_SLUG,
    publicViewSlug: PUBLIC_VIEW_SLUG,
    fcEditCount: Number(localStorage.getItem(MD_EDIT_COUNT_KEY) || 0) || 0,
    generatedAt: null,`,
  );
}

if (!html.includes("if (runtime.readOnly) return;")) {
  html = html.replace(
    "  function pushHistory() {\n    const p = getProject();",
    "  function pushHistory() {\n    if (runtime.readOnly) return;\n    const p = getProject();",
  );
}

if (!html.includes("runtime.fcEditCount")) {
  html = html.replace(
    "  function markDirty() {\n    runtime.graphCache = null;",
    `  function markDirty() {
    if (!runtime.readOnly) {
      runtime.fcEditCount = (runtime.fcEditCount || 0) + 1;
      try { localStorage.setItem(MD_EDIT_COUNT_KEY, String(runtime.fcEditCount)); } catch (_) {}
      if (runtime.generatedAt && runtime.fcEditCount === 1 && window.MapDiagramAnalytics) {
        MapDiagramAnalytics.editAfterGenerate({ source: "flowchart" });
      }
    }
    runtime.graphCache = null;`,
  );
}

if (!html.includes("function publishFlowchart")) {
  const productBlock = `
  function getFcEditCount() { return runtime.fcEditCount || 0; }

  function enableReadOnlyChrome() {
    runtime.readOnly = true;
    document.body.classList.add("public-view-mode");
    enableFlowchartMode();
  }

  async function compileFromTemplateSpec(spec, title) {
    const FC = await loadFlowchartCompilerScript();
    const batchId = uid();
    const payload = FC.compileFlowchartToCanvas(spec, batchId, uid);
    applyFlowchartPayload({ version: 1, title: title || spec.title, direction: spec.direction || "TB", nodes: spec.nodes, edges: spec.edges }, payload);
  }

  function applyCanvasPayload(title, canvas) {
    pushHistory();
    const p = getProject();
    p.title = title || p.title;
    p.name = title || p.name;
    p.nodes = (canvas.nodes || []).map((n) => normalizeNode(n));
    p.connections = canvas.connections || [];
    p.userGroups = canvas.userGroups || [];
    p.groupConnections = canvas.groupConnections || [];
    renderAll();
    markDirty();
    fitToScreen();
  }

  async function loadFlowchartTemplate(slug) {
    if (!window.FlowchartProduct) throw new Error("Product module not loaded");
    await FlowchartProduct.loadFlowchartTemplate(
      {
        getProject,
        deepCopy,
        normalizeNode,
        compileFromSpec: compileFromTemplateSpec,
        applyCanvasPayload,
      },
      slug,
    );
    showToast("Template applied", "info");
  }

  async function publishFlowchart() {
    const p = getProject();
    if (!p?.nodes?.length) {
      showToast("Add nodes before publishing", "warn");
      return;
    }
    if (!runtime.supabase || !runtime.authUser) {
      showToast("Sign in to publish a public link", "warn");
      if (!runtime.supabase) window.location.href = "/auth/";
      else openAuthModal();
      return;
    }
    const btn = document.getElementById("publishFlowchartBtn") || document.getElementById("shareBtn");
    if (btn) btn.classList.add("publishing");
    try {
      const snap = FlowchartProduct.buildSnapshot({
        getProject,
        deepCopy,
        getEditCount: getFcEditCount,
      });
      const result = await FlowchartProduct.publishToSupabase(
        {
          supabase: runtime.supabase,
          supabaseUrl: SUPABASE_URL,
          supabaseAnonKey: SUPABASE_ANON_KEY,
          normalizeSupabaseProjectUrl,
        },
        { title: snap.title, data: snap },
      );
      const url = result.url || (location.origin + "/app/view.html?slug=" + result.slug);
      await navigator.clipboard.writeText(url);
      savedIndicator.textContent = "Public link ready";
      showToast("Public link ready — copied to clipboard", "info");
      if (window.MapDiagramAnalytics) MapDiagramAnalytics.publishFlowchart({ slug: result.slug });
      setTimeout(() => (savedIndicator.textContent = "Saved"), 2000);
    } catch (err) {
      showToast((err && err.message) || "Publish failed", "warn");
    } finally {
      if (btn) btn.classList.remove("publishing");
    }
  }

  function openFlowchartTemplatePicker() {
    const catalog = window.FLOWCHART_TEMPLATE_CATALOG || [];
    if (!catalog.length || !window.FlowchartProduct) return;
    FlowchartProduct.renderTemplatePicker(catalog, (slug) => {
      void loadFlowchartTemplate(slug).catch((e) => showToast(e.message || "Template failed", "warn"));
    });
  }

  async function initPublicViewIfNeeded() {
    if (!PUBLIC_VIEW_SLUG || !window.FlowchartProduct) return;
    try {
      await FlowchartProduct.bootstrapPublicView(
        {
          getProject,
          normalizeNode,
          renderAll,
          fitToScreen,
          enableReadOnlyChrome,
          supabaseUrl: SUPABASE_URL,
          supabaseAnonKey: SUPABASE_ANON_KEY,
          normalizeSupabaseProjectUrl,
        },
        PUBLIC_VIEW_SLUG,
      );
    } catch (e) {
      showToast("Could not load shared flowchart", "warn");
    }
  }

  function initFlowchartProductUi() {
    const pub = document.getElementById("publishFlowchartBtn");
    if (pub) pub.onclick = () => void publishFlowchart();
    const tplBtn = document.getElementById("fcTemplatesBtn");
    if (tplBtn) tplBtn.onclick = () => openFlowchartTemplatePicker();
    const tryEx = document.getElementById("fcTryExampleBtn");
    if (tryEx) tryEx.onclick = () => void loadFlowchartTemplate("invoice-approval");
    rotateFcStarterChips();
    void initPublicViewIfNeeded();
  }

  function rotateFcStarterChips() {
    const popular = [
      { key: "approval", label: "Approval workflow" },
      { key: "support", label: "Support escalation" },
      { key: "onboarding", label: "Employee onboarding" },
      { key: "signup", label: "Sign-up funnel" },
    ];
    const chips = document.querySelector(".fc-starter-chips");
    if (!chips) return;
    const idx = Math.floor(Date.now() / 8000) % popular.length;
    const ordered = popular.slice(idx).concat(popular.slice(0, idx));
    chips.innerHTML = ordered
      .map((p) => '<button type="button" data-fc-chip="' + p.key + '">' + p.label + "</button>")
      .join("");
    chips.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inp = document.getElementById("flowchartPromptInput");
        if (inp) inp.value = FLOWCHART_STARTER_PROMPTS[btn.dataset.fcChip] || "";
        if (window.MapDiagramAnalytics) MapDiagramAnalytics.starterPromptClick({ chip: btn.dataset.fcChip });
      });
    });
  }

`;
  html = html.replace("  function createShareLink() {", productBlock + "\n  function createShareLink() {");
}

if (!html.includes('id="publishFlowchartBtn"')) {
  html = html.replace(
    '<button id="shareBtn" class="icon-btn" type="button" title="Create Share Link" aria-label="Create Share Link">',
    '<button id="publishFlowchartBtn" class="icon-btn" type="button" title="Publish flowchart" aria-label="Publish flowchart">',
  );
  html = html.replace(
    'data-mirror-click="shareBtn">Share link</button>',
    'data-mirror-click="publishFlowchartBtn">Publish flowchart</button>',
  );
}

if (!html.includes("document.getElementById(\"shareBtn\").onclick = publishFlowchart")) {
  html = html.replace(
    'document.getElementById("shareBtn").onclick = createShareLink;',
    'document.getElementById("shareBtn").onclick = () => void publishFlowchart();\n  const _pubBtn = document.getElementById("publishFlowchartBtn");\n  if (_pubBtn) _pubBtn.onclick = () => void publishFlowchart();',
  );
}

if (!html.includes("paintPngWatermark")) {
  html = html.replace(
    "    ctx.restore();\n    const a = document.createElement(\"a\");",
    `    paintPngWatermark(ctx, width, height);
    ctx.restore();
    const a = document.createElement("a");`,
  );
  html = html.replace(
    'showToast("PNG export complete (nodes, systems, and all link types).", "info");',
    `showToast("PNG export complete (nodes, systems, and all link types).", "info");
    if (window.MapDiagramAnalytics) MapDiagramAnalytics.exportPng({ flowchart: isFlowchartMode() });
    if (isFlowchartMode()) {
      window.setTimeout(() => {
        showToast("Shared this flowchart? Publish it online.", "info");
        if (window.MapDiagramAnalytics) MapDiagramAnalytics.shareAfterExport({});
      }, 900);
    }`,
  );
  html = html.replace(
    "  function exportAsPng() {",
    `  function paintPngWatermark(ctx, w, h) {
    if (!isFlowchartMode()) return;
    const label = "MapDiagram";
    ctx.save();
    ctx.font = "11px Inter, Segoe UI, Arial";
    ctx.fillStyle = "rgba(169, 188, 230, 0.42)";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, w - 14, h - 10);
    ctx.restore();
  }

  function exportAsPng() {`,
  );
}

if (!html.includes("fcTryExampleBtn")) {
  html = html.replace(
    '<div class="fc-starter-chips" role="group" aria-label="Starter prompts">',
    `<p class="fc-empty-hint muted" style="margin:0 0 8px;font-size:12px">Popular workflows — pick a chip or try an example.</p>
          <div class="fc-starter-chips" role="group" aria-label="Starter prompts">`,
  );
  html = html.replace(
    '<button type="button" id="fcGenerateBtn" class="btn-ai-primary" style="width:100%;margin-top:16px">Generate flowchart</button>',
    `<button type="button" id="fcTryExampleBtn" class="text-btn-sm" style="width:100%;margin-top:10px">Try example template</button>
          <button type="button" id="fcTemplatesBtn" class="text-btn-sm" style="width:100%;margin-top:6px">Browse templates</button>
          <button type="button" id="fcGenerateBtn" class="btn-ai-primary" style="width:100%;margin-top:16px">Generate flowchart</button>`,
  );
}

if (!html.includes("initFlowchartProductUi()")) {
  html = html.replace(
    "  initFlowchartModeUi();",
    "  initFlowchartModeUi();\n  initFlowchartProductUi();",
  );
}

if (!html.includes("URLSearchParams(location.search).get(\"template\")")) {
  html = html.replace(
    "    void initPublicViewIfNeeded();",
    `    void initPublicViewIfNeeded();
    const tplSlug = new URLSearchParams(location.search).get("template");
    if (tplSlug && !PUBLIC_VIEW_SLUG) {
      window.setTimeout(() => {
        void loadFlowchartTemplate(tplSlug).catch(() => {});
      }, 400);
    }`,
  );
}

if (!html.includes("runtime.generatedAt = Date.now()")) {
  html = html.replace(
    "      if (aiStatus) aiStatus.textContent = `Generated",
    "      runtime.generatedAt = Date.now();\n      runtime.fcEditCount = 0;\n      if (aiStatus) aiStatus.textContent = `Generated",
  );
}

fs.writeFileSync(path, html);
console.log("patched tool.html");
