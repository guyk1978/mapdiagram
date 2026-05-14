/**
 * One-way sync for static HTML: single analytics entry, unified nav, OG where missing,
 * fix placeholder domains, mega-footer on auth pages, strip share-dock on auth.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE = "https://mapdiagram.com";

const GTAG_RE =
  /(?:<!--\s*Google tag \(gtag\.js\)\s*-->\s*)?<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-LDVB4978S7"><\/script>\s*<script>[\s\S]*?<\/script>\s*/g;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (name.endsWith(".html")) files.push(p);
  }
  return files;
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function relPath(full) {
  return relative(ROOT, full).replace(/\\/g, "/");
}

function canonicalFor(rel) {
  if (rel === "index.html") return `${BASE}/`;
  const m = rel.match(/^(.+)\/index\.html$/);
  if (m) return `${BASE}/${m[1]}/`;
  return `${BASE}/${rel}`;
}

function ogTwitterBlock(canon, title, description) {
  const img = `${BASE}/assets/ui-preview.svg`;
  return `  <meta property="og:type" content="website">
  <meta property="og:url" content="${escAttr(canon)}">
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${escAttr(description)}">
  <meta property="og:image" content="${escAttr(img)}">
  <meta property="og:site_name" content="MapDiagram">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escAttr(canon)}">
  <meta name="twitter:title" content="${escAttr(title)}">
  <meta name="twitter:description" content="${escAttr(description)}">
  <meta name="twitter:image" content="${escAttr(img)}">
`;
}

function extractTitleDesc(html) {
  const tm = html.match(/<title>([^<]*)<\/title>/i);
  const dm = html.match(
    /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/i,
  );
  return {
    title: (tm && tm[1]) || "MapDiagram",
    description: (dm && dm[1]) || "",
  };
}

function injectSocial(html, rel) {
  if (html.includes('property="og:url"')) return html;
  const { title, description } = extractTitleDesc(html);
  const canon = canonicalFor(rel);
  const og = ogTwitterBlock(canon, title, description);
  if (html.includes('<link rel="canonical"')) {
    return html.replace(
      /(<link rel="canonical" href="[^"]*"\s*\/?>\s*\n?)/i,
      `$1${og}`,
    );
  }
  const dm = html.match(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
  );
  if (dm) {
    const canonLine = `  <link rel="canonical" href="${escAttr(canon)}">\n`;
    return html.replace(dm[0], `${dm[0]}\n${canonLine}${og}`);
  }
  return html;
}

function stripGtag(html) {
  if (html.includes("site-analytics.js")) {
    return html.replace(GTAG_RE, "");
  }
  return html.replace(
    GTAG_RE,
    '  <script src="/assets/site-analytics.js" defer></script>\n',
  );
}

function applyNav(html, navHtml) {
  if (!navHtml || !html.includes('<header class="nav">')) return html;
  return html.replace(/<header class="nav">[\s\S]*?<\/header>/, navHtml.trim());
}

function stripShareDock(html, rel) {
  if (!rel.startsWith("auth/")) return html;
  return html.replace(
    /\s*<script src="\/shared\/share-dock\.js" defer><\/script>\s*/g,
    "\n",
  );
}

function applyMegaFooter(html, rel) {
  if (!rel.startsWith("auth/")) return html;
  let footerHtml;
  try {
    footerHtml = readFileSync(join(ROOT, "partials", "footer.html"), "utf8");
  } catch {
    return html;
  }
  if (!html.includes("<footer")) return html;
  return html.replace(
    /<footer class="footer">[\s\S]*?<\/footer>/,
    footerHtml.trim(),
  );
}

let navHtml = "";
try {
  navHtml = readFileSync(join(ROOT, "partials", "nav.html"), "utf8");
} catch {
  /* optional */
}

function ensureViewportCharset(html) {
  if (html.includes('name="viewport"')) return html;
  if (!html.includes("site-analytics.js")) return html;
  return html.replace(
    /<script src="\/assets\/site-analytics\.js" defer><\/script>\s*/i,
    `$&<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n`,
  );
}

function skipRel(rel) {
  return rel === "app/tool.html" || rel === "partials/footer.html";
}

let n = 0;
for (const full of walk(ROOT)) {
  const rel = relPath(full);
  if (skipRel(rel)) continue;
  let html = readFileSync(full, "utf8");
  const orig = html;
  html = stripGtag(html);
  html = ensureViewportCharset(html);
  html = applyNav(html, navHtml);
  html = stripShareDock(html, rel);
  html = applyMegaFooter(html, rel);
  html = injectSocial(html, rel);
  html = html.replace(/https:\/\/your-domain\.com\//g, `${BASE}/`);
  if (html !== orig) {
    writeFileSync(full, html, "utf8");
    console.log("synced", rel);
    n++;
  }
}
console.log(`sync-marketing-shell: ${n} files updated`);
