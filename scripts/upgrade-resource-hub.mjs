/**
 * Upgrade legacy `.section.related` blocks to resource-hub grid layout.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";
import { resourceHubSection } from "./lib/content-page-template.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "mapdiagram-main") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith(".html")) files.push(p);
  }
  return files;
}

function extractList(html, heading) {
  const re = new RegExp(
    `<h2>${heading}</h2>\\s*<ul>([\\s\\S]*?)</ul>`,
    "i",
  );
  const m = html.match(re);
  if (!m) return "";
  return m[1]
    .replace(/<a href="/g, '<a class="resource-hub__pill" href="')
    .replace(/class="resource-hub__pill" class="resource-hub__pill"/g, 'class="resource-hub__pill"');
}

function upgradeRelatedSection(html) {
  const block = html.match(
    /<section class="section related"[\s\S]*?<\/section>/i,
  );
  if (!block || block[0].includes("resource-hub")) return html;

  const section = block[0];
  const intros = [];
  for (const m of section.matchAll(
    /<p class="lead">([\s\S]*?)<\/p>/gi,
  )) {
    if (!/Related landing|Core money/i.test(m[1])) {
      intros.push(`      <p class="lead resource-hub__intro">${m[1].trim()}</p>`);
    }
  }

  let landings = extractList(section, "Related landing pages");
  let guides = extractList(section, "Related guides");
  if (!landings && !guides) return html;

  landings = landings.replace(
    /<a (?!class=)/g,
    '<a class="resource-hub__pill" ',
  );
  guides = guides.replace(/<a (?!class=)/g, '<a class="resource-hub__pill" ');

  const coreM = section.match(/<h2>Core money page<\/h2>\s*<p class="lead">([\s\S]*?)<\/p>/i);
  const coreHtml = coreM ? coreM[1].trim() : "";

  const footerM = section.match(/<p class="muted related-footer-note">([\s\S]*?)<\/p>/i);
  const footerNote = footerM ? footerM[1].trim() : undefined;

  const replacement = resourceHubSection({
    introHtml: intros.join("\n"),
    landingsHtml: landings.trim(),
    guidesHtml: guides.trim(),
    coreHtml,
    footerNote,
  });

  return html.replace(block[0], replacement);
}

let n = 0;
for (const full of walk(ROOT)) {
  const rel = relative(ROOT, full).replace(/\\/g, "/");
  if (!rel.startsWith("diagram-tool-for-")) continue;
  let html = readFileSync(full, "utf8");
  const next = upgradeRelatedSection(html);
  if (next !== html) {
    writeFileSync(full, next, "utf8");
    console.log("upgraded", rel);
    n++;
  }
}
console.log(`upgrade-resource-hub: ${n} files`);
