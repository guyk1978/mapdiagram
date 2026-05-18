import fs from "node:fs";

const path = "app/tool.html";
let h = fs.readFileSync(path, "utf8");

const blockStart = h.indexOf('<motion>');
const idStart = h.indexOf('id="flowchartEmptyState"');
const start = idStart > 0 ? h.lastIndexOf("<div", idStart) : blockStart;

let pos = start;
let depth = 0;
while (pos < h.length) {
  if (h.startsWith("<div", pos)) {
    depth++;
    pos += 4;
    continue;
  }
  if (h.startsWith("</div>", pos)) {
    depth--;
    pos += 6;
    if (depth === 0) break;
    continue;
  }
  pos++;
}

const insert = `      <div id="fcAssistantRoot" class="fc-assistant-root" data-state="collapsed" hidden>
        <p id="fcCanvasEmptyHint" class="fc-canvas-empty-hint" hidden>Canvas is empty — use Generate to describe your process, or add nodes from the library.</p>
        <div id="fcAssistantBackdrop" class="fc-assistant-backdrop" hidden aria-hidden="true"></div>
        <motion>
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
      </div>
`;

if (start < 0 || pos <= start) {
  console.error("block not found", start, pos);
  process.exit(1);
}

const cleaned = insert.replace(/<\/?motion>/g, "");
const newH = h.slice(0, start) + cleaned + h.slice(pos);
fs.writeFileSync(path, newH);
console.log("replaced bytes", pos - start, "->", cleaned.length);
