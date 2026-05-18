import fs from "node:fs";

const path = "app/tool.html";
let html = fs.readFileSync(path, "utf8");

const OLD_EMPTY_HTML = `      <motion>
      <div id="flowchartEmptyState" class="fc-empty-state" hidden aria-hidden="true">
        <div class="fc-empty-card">
          <h2>Design your flowchart</h2>
          <p>Describe your process, pick a starter, or add nodes from the library.</p>
          <textarea id="flowchartPromptInput" placeholder="e.g. User submits request → manager reviews → approved or revise → complete" rows="3" aria-label="Flowchart prompt (coming soon)"></textarea>
          <div class="fc-starter-chips" role="group" aria-label="Starter prompts">
            <button type="button" data-fc-chip="approval">Approval workflow</button>
            <button type="button" data-fc-chip="onboarding">Employee onboarding</button>
            <button type="button" data-fc-chip="support">Support ticket</button>
            <button type="button" data-fc-chip="signup">Sign-up funnel</button>
          </div>
          <button type="button" id="fcGenerateBtn" class="btn-ai-primary" style="width:100%;margin-top:16px">Generate flowchart</button>
        </div>
      </div>`;

const NEW_ASSISTANT_HTML = `      <div id="fcAssistantRoot" class="fc-assistant-root" data-state="collapsed" hidden>
        <p id="fcCanvasEmptyHint" class="fc-canvas-empty-hint" hidden>Canvas is empty — use Generate to describe your process, or add nodes from the library.</p>
        <div id="fcAssistantBackdrop" class="fc-assistant-backdrop" hidden aria-hidden="true"></motion>
        <div id="fcAssistantShell" class="fc-assistant-shell" aria-hidden="true">
          <div class="fc-assistant-card" role="document">
            <div class="fc-assistant-card-head">
              <h2 id="fcAssistantTitle">Flowchart Assistant</h2>
              <button type="button" id="fcAssistantCloseBtn" class="fc-assistant-close" aria-label="Close assistant">&times;</button>
            </div>
            <p class="fc-assistant-lead">Describe your process, pick a starter, or refine an existing diagram.</p>
            <textarea id="flowchartPromptInput" placeholder="e.g. User submits request → manager reviews → approved or revise → complete" rows="3" aria-label="Describe your flowchart"></textarea>
            <div id="fcStarterChips" class="fc-starter-chips" role="group" aria-label="Starter prompts"></div>
            <div class="fc-assistant-actions">
              <button type="button" id="fcTryExampleBtn" class="text-btn-sm">Try example</button>
              <button type="button" id="fcTemplatesBtn" class="text-btn-sm">Templates</button>
              <button type="button" id="fcGenerateBtn" class="btn-ai-primary">Generate flowchart</button>
            </div>
          </div>
        </div>
        <button type="button" id="fcAssistantFab" class="fc-assistant-fab" hidden aria-label="Open flowchart assistant" title="Generate flowchart (Ctrl+K)">
          <span class="fc-assistant-fab-icon" aria-hidden="true">✦</span>
          <span class="fc-assistant-fab-label">Generate</span>
          <span class="fc-assistant-fab-hint" aria-hidden="true">⌘K</span>
        </button>
      </div>`;

// fix accidental motion tags in template
const cleanNew = NEW_ASSISTANT_HTML.replace(/<\/?motion>/g, "").replace("</motion>", "");

if (html.includes("flowchartEmptyState")) {
  html = html.replace(
    /<div id="flowchartEmptyState"[\s\S]*?<\/motion>\s*<\/div>\s*<div id="fcQuickEdit"/,
    cleanNew.trim() + "\n      <div id=\"fcQuickEdit\"",
  );
}

const ASSISTANT_CSS = `
  body.public-view-mode #fcAssistantRoot { display: none !important; }
  .fc-assistant-root {
    position: absolute;
    inset: 0;
    z-index: 12;
    pointer-events: none;
  }
  .fc-assistant-root[data-state="collapsed"] { pointer-events: none; }
  .fc-assistant-root[data-state="collapsed"] .fc-assistant-fab {
    pointer-events: auto;
  }
  .fc-canvas-empty-hint {
    position: absolute;
    left: 50%;
    top: 42%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    color: var(--muted);
    background: rgba(14, 18, 30, 0.55);
    border: 1px solid rgba(154, 170, 205, 0.15);
    pointer-events: none;
    max-width: 320px;
    text-align: center;
    opacity: 0;
    transition: opacity 0.28s ease;
  }
  .fc-canvas-empty-hint:not([hidden]) { opacity: 1; }
  .fc-assistant-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(6, 8, 14, 0.35);
    backdrop-filter: blur(2px);
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.26s ease;
  }
  .fc-assistant-backdrop:not([hidden]) { opacity: 1; }
  .fc-assistant-shell {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    transform: translateY(10px) scale(0.98);
    transition:
      opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-shell {
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: radial-gradient(ellipse 70% 50% at 50% 40%, rgba(122, 162, 255, 0.08), transparent 70%);
    pointer-events: auto;
  }
  .fc-assistant-root[data-state="panel"] .fc-assistant-shell {
    right: 20px;
    bottom: 88px;
    left: auto;
    top: auto;
    width: min(420px, calc(100% - 40px));
    max-height: min(72vh, 520px);
    pointer-events: auto;
  }
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-shell,
  .fc-assistant-root[data-state="panel"] .fc-assistant-shell {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }
  .fc-assistant-card {
    pointer-events: auto;
    width: 100%;
    max-width: 440px;
    max-height: min(72vh, 520px);
    overflow: auto;
    padding: 22px 22px 18px;
    border-radius: 18px;
    border: 1px solid rgba(122, 162, 255, 0.28);
    background: linear-gradient(165deg, rgba(22, 28, 42, 0.97), rgba(14, 18, 30, 0.95));
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    backdrop-filter: blur(14px);
    text-align: left;
  }
  html[data-theme="light"] .fc-assistant-card {
    background: linear-gradient(165deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 252, 0.96));
    border-color: rgba(122, 162, 255, 0.35);
    box-shadow: 0 20px 48px rgba(30, 50, 90, 0.14);
  }
  .fc-assistant-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  .fc-assistant-card-head h2 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .fc-assistant-close {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: rgba(122, 162, 255, 0.1);
    color: var(--text);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .fc-assistant-close:hover { background: rgba(122, 162, 255, 0.22); }
  .fc-assistant-lead {
    margin: 0 0 14px;
    font-size: 13px;
    color: var(--muted);
    line-height: 1.45;
  }
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-lead,
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-card-head h2 {
    text-align: center;
  }
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-card-head {
    justify-content: center;
    position: relative;
  }
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-close {
    position: absolute;
    right: 0;
    top: 0;
  }
  .fc-assistant-card textarea {
    width: 100%;
    min-height: 72px;
    resize: vertical;
    margin-bottom: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(97, 121, 171, 0.45);
    background: rgba(8, 12, 22, 0.5);
    color: var(--text);
    font: inherit;
    font-size: 13px;
    line-height: 1.4;
    box-sizing: border-box;
  }
  html[data-theme="light"] .fc-assistant-card textarea {
    background: #fff;
    border-color: rgba(200, 210, 230, 0.85);
  }
  .fc-assistant-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }
  .fc-assistant-actions .btn-ai-primary {
    margin-left: auto;
    min-width: 140px;
  }
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-actions {
    justify-content: center;
  }
  .fc-assistant-root[data-state="onboarding"] .fc-assistant-actions .btn-ai-primary {
    margin-left: 0;
    width: 100%;
    margin-top: 8px;
  }
  .fc-assistant-fab {
    position: absolute;
    right: 22px;
    bottom: 22px;
    z-index: 13;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px 12px 14px;
    border: 1px solid rgba(122, 162, 255, 0.45);
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(90, 130, 230, 0.95), rgba(122, 162, 255, 0.88));
    color: #fff;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    box-shadow: 0 10px 28px rgba(60, 90, 180, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
    pointer-events: auto;
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, opacity 0.22s ease;
  }
  .fc-assistant-fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(60, 90, 180, 0.42);
  }
  .fc-assistant-fab-icon { font-size: 14px; opacity: 0.95; }
  .fc-assistant-fab-hint {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.75;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.15);
  }
  @media (prefers-reduced-motion: reduce) {
    .fc-assistant-shell,
    .fc-assistant-backdrop,
    .fc-canvas-empty-hint,
    .fc-assistant-fab { transition: none; }
  }
`;

if (!html.includes("fc-assistant-root")) {
  html = html.replace(
    "  .fc-quick-edit {",
    ASSISTANT_CSS + "\n  .fc-quick-edit {",
  );
}

const ASSISTANT_JS = `
  const FC_ASSISTANT_GENERATED_KEY = "flowchart-assistant-generated";
  const FC_ASSISTANT_DISMISSED_KEY = "flowchart-assistant-dismissed";
  const FC_ASSISTANT_DRAFT_KEY = "flowchart-assistant-draft";

  function hasFlowchartBeenGenerated() {
    try {
      if (localStorage.getItem(FC_ASSISTANT_GENERATED_KEY) === "1") return true;
    } catch (_) {}
    return (getProject()?.nodes?.length || 0) > 0;
  }

  function getFlowchartAssistantState() {
    if (!isFlowchartMode() || runtime.readOnly) return "collapsed";
    if (!hasFlowchartBeenGenerated()) {
      try {
        if (localStorage.getItem(FC_ASSISTANT_DISMISSED_KEY) !== "1") return "onboarding";
      } catch (_) {}
    }
    return runtime.fcAssistantPanelOpen ? "panel" : "collapsed";
  }

  function persistFlowchartAssistantDraft(save) {
    const input = document.getElementById("flowchartPromptInput");
    if (!input) return;
    try {
      if (save === false) {
        localStorage.setItem(FC_ASSISTANT_DRAFT_KEY, input.value);
        return;
      }
      const draft = localStorage.getItem(FC_ASSISTANT_DRAFT_KEY);
      if (draft != null && !input.value.trim()) input.value = draft;
    } catch (_) {}
  }

  function syncFlowchartAssistantUi() {
    const root = document.getElementById("fcAssistantRoot");
    if (!root || !isFlowchartMode() || runtime.readOnly) {
      if (root) root.hidden = true;
      return;
    }
    root.hidden = false;
    const state = getFlowchartAssistantState();
    root.dataset.state = state;

    const hint = document.getElementById("fcCanvasEmptyHint");
    const emptyCanvas = !(getProject()?.nodes?.length);
    if (hint) {
      const showHint = emptyCanvas && state === "collapsed" && hasFlowchartBeenGenerated();
      hint.hidden = !showHint;
    }

    const backdrop = document.getElementById("fcAssistantBackdrop");
    if (backdrop) {
      const showBackdrop = state === "panel";
      backdrop.hidden = !showBackdrop;
      backdrop.setAttribute("aria-hidden", showBackdrop ? "false" : "true");
    }

    const shell = document.getElementById("fcAssistantShell");
    if (shell) {
      const showShell = state === "onboarding" || state === "panel";
      shell.hidden = !showShell;
      shell.setAttribute("aria-hidden", showShell ? "false" : "true");
    }

    const fab = document.getElementById("fcAssistantFab");
    if (fab) fab.hidden = state === "onboarding";

    if (state === "onboarding" && !runtime._fcAssistantOnboardFocused) {
      runtime._fcAssistantOnboardFocused = true;
      requestAnimationFrame(() => document.getElementById("flowchartPromptInput")?.focus());
    }
  }

  function setFlowchartAssistantState(next) {
    if (next === "panel") runtime.fcAssistantPanelOpen = true;
    else runtime.fcAssistantPanelOpen = false;
    if (next === "collapsed" && !hasFlowchartBeenGenerated()) {
      try { localStorage.setItem(FC_ASSISTANT_DISMISSED_KEY, "1"); } catch (_) {}
    }
    syncFlowchartAssistantUi();
  }

  function openFlowchartAssistant() {
    persistFlowchartAssistantDraft(true);
    setFlowchartAssistantState("panel");
    requestAnimationFrame(() => document.getElementById("flowchartPromptInput")?.focus());
  }

  function closeFlowchartAssistant() {
    persistFlowchartAssistantDraft(false);
    setFlowchartAssistantState("collapsed");
    workspace?.focus?.();
  }

  function toggleFlowchartAssistant() {
    if (getFlowchartAssistantState() === "panel") closeFlowchartAssistant();
    else openFlowchartAssistant();
  }

  function markFlowchartAssistantGenerated() {
    try { localStorage.setItem(FC_ASSISTANT_GENERATED_KEY, "1"); } catch (_) {}
    persistFlowchartAssistantDraft(false);
    runtime.fcAssistantPanelOpen = false;
    syncFlowchartAssistantUi();
  }

  function syncFlowchartEmptyState() {
    syncFlowchartAssistantUi();
  }

  function bindFcStarterChipListeners() {
    document.querySelectorAll("#fcStarterChips [data-fc-chip]").forEach((btn) => {
      if (btn.dataset.fcChipBound) return;
      btn.dataset.fcChipBound = "1";
      btn.addEventListener("click", () => {
        setFlowchartPromptText(FLOWCHART_STARTER_PROMPTS[btn.dataset.fcChip] || "");
        document.getElementById("flowchartPromptInput")?.focus();
        if (window.MapDiagramAnalytics) MapDiagramAnalytics.starterPromptClick({ chip: btn.dataset.fcChip });
      });
    });
  }

  function initFlowchartAssistantUi() {
    document.getElementById("fcAssistantCloseBtn")?.addEventListener("click", () => closeFlowchartAssistant());
    document.getElementById("fcAssistantFab")?.addEventListener("click", () => openFlowchartAssistant());
    document.getElementById("fcAssistantBackdrop")?.addEventListener("pointerdown", () => closeFlowchartAssistant());
    const input = document.getElementById("flowchartPromptInput");
    input?.addEventListener("input", () => persistFlowchartAssistantDraft(false));
    persistFlowchartAssistantDraft(true);
    rotateFcStarterChips();
    syncFlowchartAssistantUi();
  }
`;

if (!html.includes("getFlowchartAssistantState")) {
  html = html.replace(
    "  function syncFlowchartEmptyState() {\n    const ov = document.getElementById(\"flowchartEmptyState\");",
    ASSISTANT_JS + "\n  function _syncFlowchartEmptyStateLegacy() {\n    const ov = document.getElementById(\"flowchartEmptyState\");",
  );
  html = html.replace(
    /  function _syncFlowchartEmptyStateLegacy\(\) \{[\s\S]*?  \}\n\n  function syncFcQuickEditToolbar/,
    "  function syncFcQuickEditToolbar",
  );
}

if (!html.includes("fcAssistantPanelOpen")) {
  html = html.replace(
    "    fcConnEnterIds: null,",
    "    fcConnEnterIds: null,\n    fcAssistantPanelOpen: false,\n    _fcAssistantOnboardFocused: false,",
  );
}

if (!html.includes("markFlowchartAssistantGenerated")) {
  html = html.replace(
    "      applyFlowchartPayload(spec, payload);\n      runtime.generatedAt = Date.now();",
    "      applyFlowchartPayload(spec, payload);\n      markFlowchartAssistantGenerated();\n      runtime.generatedAt = Date.now();",
  );
}

if (!html.includes("initFlowchartAssistantUi()")) {
  html = html.replace(
    "    rotateFcStarterChips();\n    syncFlowchartEmptyState();",
    "    initFlowchartAssistantUi();",
  );
  html = html.replace(
    "    document.querySelectorAll(\"[data-fc-chip]\").forEach((btn) => {\n      btn.addEventListener(\"click\", () => {\n        const input = document.getElementById(\"flowchartPromptInput\");\n        if (!input) return;\n        const t = FLOWCHART_STARTER_PROMPTS[btn.dataset.fcChip] || \"\";\n        setFlowchartPromptText(t);\n        input.focus();\n      });\n    });",
    "",
  );
}

html = html.replace(
  "  function getFlowchartPromptText() {\n    const empty = document.getElementById(\"flowchartPromptInput\");\n    const modal = document.getElementById(\"aiPromptInput\");\n    if (empty && !empty.hidden && empty.offsetParent !== null) return empty.value.trim();\n    if (modal && aiModalOverlay?.classList.contains(\"open\")) return modal.value.trim();\n    return (empty?.value || modal?.value || \"\").trim();\n  }",
  `  function getFlowchartPromptText() {
    const input = document.getElementById("flowchartPromptInput");
    const modal = document.getElementById("aiPromptInput");
    if (modal && aiModalOverlay?.classList.contains("open")) return modal.value.trim();
    return (input?.value || modal?.value || "").trim();
  }`,
);

html = html.replace(
  `    const chips = document.querySelector(".fc-starter-chips");
    if (!chips) return;`,
  `    const chips = document.getElementById("fcStarterChips");
    if (!chips) return;`,
);

html = html.replace(
  `    chips.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inp = document.getElementById("flowchartPromptInput");
        if (inp) inp.value = FLOWCHART_STARTER_PROMPTS[btn.dataset.fcChip] || "";
        if (window.MapDiagramAnalytics) MapDiagramAnalytics.starterPromptClick({ chip: btn.dataset.fcChip });
      });
    });`,
  `    bindFcStarterChipListeners();`,
);

if (!html.includes('getFlowchartAssistantState() === "panel"')) {
  html = html.replace(
    `    const cpOv = document.getElementById("commandPaletteOverlay");
    if (e.key === "Escape" && cpOv && !cpOv.hidden) {
      closeCommandPalette();
      return;
    }`,
    `    if (isFlowchartMode() && getFlowchartAssistantState() === "panel") {
      e.preventDefault();
      closeFlowchartAssistant();
      return;
    }
    const cpOv = document.getElementById("commandPaletteOverlay");
    if (e.key === "Escape" && cpOv && !cpOv.hidden) {
      closeCommandPalette();
      return;
    }`,
  );

  html = html.replace(
    `    if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (runtime.focusNodeId) return;
      if (cpOv && !cpOv.hidden) closeCommandPalette();
      else openCommandPalette(true);
      return;
    }`,
    `    if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && isFlowchartMode()) {
      e.preventDefault();
      if (runtime.focusNodeId) return;
      toggleFlowchartAssistant();
      return;
    }
    if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (runtime.focusNodeId) return;
      if (cpOv && !cpOv.hidden) closeCommandPalette();
      else openCommandPalette(true);
      return;
    }`,
  );
}

if (!html.includes('id: "fcAssistant"')) {
  html = html.replace(
    `{ id: "palette", label: "Command palette", keys: "Ctrl+K / ⌘K",`,
    `{ id: "fcAssistant", label: "Flowchart assistant", keys: "Ctrl+K / ⌘K", keywords: "generate ai prompt", run: () => toggleFlowchartAssistant() },
      { id: "palette", label: "Command palette", keys: "Ctrl+Shift+K",`,
  );
}

html = html.replace(
  "  body.public-view-mode .fc-empty-state,",
  "  body.public-view-mode .fc-assistant-root,\n  body.public-view-mode .fc-empty-state,",
);

fs.writeFileSync(path, html);
console.log("patched flowchart assistant");
