/**
 * Replace dark ui-preview product-shot with diagram spotlight; add diagram to resource-hub__core.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";
import { diagramSpotlightHtml } from "./lib/content-page-template.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DIAGRAM_CSS = `<link rel="stylesheet" href="/assets/marketing-diagram.css">`;
const SPOTLIGHT = diagramSpotlightHtml();
const SPOTLIGHT_COMPACT = diagramSpotlightHtml({ compact: true });

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "mapdiagram-main") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith(".html")) files.push(p);
  }
  return files;
}

function ensureDiagramCss(html) {
  if (html.includes("marketing-diagram.css")) return html;
  if (html.includes("content-page.css")) {
    return html.replace(
      /<link rel="stylesheet" href="\/assets\/content-page\.css">/,
      `<link rel="stylesheet" href="/assets/content-page.css">\n${DIAGRAM_CSS}`,
    );
  }
  if (html.includes('href="/assets/site.css"')) {
    return html.replace(
      /<link rel="stylesheet" href="\/assets\/site\.css">/,
      `<link rel="stylesheet" href="/assets/site.css">\n${DIAGRAM_CSS}`,
    );
  }
  return html;
}

function upgradeProductShot(html) {
  if (html.includes("diagram-spotlight")) return html;
  return html.replace(
    /<div class="product-shot([^"]*)">\s*<figure>\s*<img src="\/assets\/ui-preview\.svg"[^>]*>\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>\s*<\/div>/gi,
    `<div class="product-shot product-shot--diagram$1">
  <figure>
    ${SPOTLIGHT}
    <figcaption>$2</figcaption>
  </figure>
</div>`,
  );
}

function upgradeResourceCore(html) {
  if (!html.includes("resource-hub__core") || html.includes("resource-hub__core-layout"))
    return html;
  return html.replace(
    /<div class="resource-hub__core">\s*<h3 class="resource-hub__heading">Core money page<\/h3>\s*<p class="resource-hub__note">([\s\S]*?)<\/p>\s*<p class="muted related-footer-note">([\s\S]*?)<\/p>\s*<\/div>/i,
    `<div class="resource-hub__core">
    <div class="resource-hub__core-layout resource-hub__core-layout--split">
      <div class="resource-hub__core-copy">
        <h3 class="resource-hub__heading">Core money page</h3>
        <p class="resource-hub__note">$1</p>
        <p class="muted related-footer-note">$2</p>
      </div>
      ${SPOTLIGHT_COMPACT}
    </div>
  </div>`,
  );
}

let n = 0;
for (const full of walk(ROOT)) {
  const rel = relative(ROOT, full).replace(/\\/g, "/");
  if (!rel.startsWith("diagram-tool-for-")) continue;
  let html = readFileSync(full, "utf8");
  const orig = html;
  html = ensureDiagramCss(html);
  html = upgradeProductShot(html);
  html = upgradeResourceCore(html);
  if (html !== orig) {
    writeFileSync(full, html, "utf8");
    console.log("upgraded", rel);
    n++;
  }
}
console.log(`upgrade-marketing-diagram: ${n} files`);
