/**
 * One-way sync for static HTML: analytics, theme engine, unified nav with toggle,
 * site-shell.js, OG where missing, mega-footer on auth pages.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE = "https://mapdiagram.com";

const HEAD_SCRIPTS = `<script src="/assets/theme-engine.js"></script>
  <script src="/assets/analytics-config.js"></script>
  <script src="/assets/consent-scripts.js" defer></script>
  <script src="/assets/cookie-consent.js" defer></script>
  <script src="/assets/site-analytics.js" defer></script>`;

const LEGACY_HEAD_SCRIPTS =
  /<script src="\/assets\/theme-engine\.js"><\/script>\s*<script src="\/assets\/site-analytics\.js" defer><\/script>/i;

const FAB_SNIPPET = `<a class="fab-open-app" href="/app/" aria-label="Open diagram editor"><span class="fab-open-app__text">Open editor</span></a>`;

const CONTENT_PAGE_CSS = `<link rel="stylesheet" href="/assets/content-page.css">
<link rel="stylesheet" href="/assets/marketing-diagram.css">`;

const CONTENT_PAGE_SKIP = new Set([
  "index.html",
  "workflow-hub/index.html",
  "app/tool.html",
  "app/index.html",
  "partials/nav.html",
  "partials/footer.html",
]);

const GTAG_RE =
  /(?:<!--\s*Google tag \(gtag\.js\)\s*-->\s*)?<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-LDVB4978S7"><\/script>\s*<script>[\s\S]*?<\/script>\s*/g;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "mapdiagram-main") continue;
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
  return html.replace(GTAG_RE, `  ${HEAD_SCRIPTS}\n`);
}

function ensureHeadChrome(html, rel) {
  if (rel === "app/tool.html") return html;
  html = stripGtag(html);
  if (html.includes("cookie-consent.js")) return html;
  if (LEGACY_HEAD_SCRIPTS.test(html)) {
    return html.replace(LEGACY_HEAD_SCRIPTS, HEAD_SCRIPTS);
  }
  if (html.includes("theme-engine.js") && html.includes("site-analytics.js")) {
    return html
      .replace(/<script src="\/assets\/site-analytics\.js" defer><\/script>/i, "")
      .replace(
        /<script src="\/assets\/theme-engine\.js"><\/script>/i,
        HEAD_SCRIPTS,
      );
  }
  if (html.includes("theme-engine.js")) return html;
  if (html.includes("site-analytics.js")) {
    return html.replace(
      /<script src="\/assets\/site-analytics\.js" defer><\/script>/i,
      HEAD_SCRIPTS,
    );
  }
  return html.replace(/<head>/i, `<head>\n  ${HEAD_SCRIPTS}\n`);
}

function ensureSiteShell(html, rel) {
  if (rel === "app/tool.html" || rel === "app/index.html") return html;
  if (html.includes("site-shell.js")) return html;
  const tag = '<script src="/assets/site-shell.js" defer></script>\n';
  if (/<script src="\/shared\/share-dock\.js" defer><\/script>/i.test(html)) {
    return html.replace(
      /<script src="\/shared\/share-dock\.js" defer><\/script>/i,
      (m) => `${m}\n${tag}`,
    );
  }
  return html.replace(/<\/body>/i, `${tag}</body>`);
}

function stripInlineThemeHandlers(html) {
  return html.replace(
    /<script>\s*\(function\s*\(\)\s*\{\s*var btn = document\.getElementById\("siteThemeToggle"\);[\s\S]*?\}\)\(\);\s*<\/script>\s*/gi,
    "",
  );
}

function applyNav(html, navHtml) {
  if (!navHtml || !html.includes("<header class=\"nav")) return html;
  return html.replace(/<header class="nav[^"]*">[\s\S]*?<\/header>/, navHtml.trim());
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
    /<script src="\/assets\/theme-engine\.js"><\/script>(?:\s*<script src="\/assets\/analytics-config\.js"><\/script>)?(?:\s*<script src="\/assets\/consent-scripts\.js" defer><\/script>)?(?:\s*<script src="\/assets\/cookie-consent\.js" defer><\/script>)?\s*<script src="\/assets\/site-analytics\.js" defer><\/script>\s*/i,
    `$&<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n`,
  );
}

function injectFab(html, rel) {
  if (rel === "app/tool.html" || rel === "app/index.html") return html;
  if (html.includes("fab-open-app")) return html;
  if (/<script src="\/shared\/share-dock\.js" defer><\/script>/i.test(html)) {
    return html.replace(
      /<script src="\/shared\/share-dock\.js" defer><\/script>\s*<\/body>/i,
      (m) => `${m}\n${FAB_SNIPPET}\n`,
    );
  }
  return html.replace(/<\/body>/i, `${FAB_SNIPPET}\n</body>`);
}

function skipRel(rel) {
  return (
    rel === "app/tool.html" ||
    rel === "partials/footer.html" ||
    rel === "partials/nav.html"
  );
}

const BLOG_ARTICLE_CSS = `<link rel="stylesheet" href="/assets/blog-article.css">`;

function shouldBlogArticleChrome(rel) {
  return rel.startsWith("blog/") && rel !== "blog/index.html" && rel.endsWith("/index.html");
}

function ensureBlogArticleChrome(html, rel) {
  if (!shouldBlogArticleChrome(rel)) return html;
  if (!html.includes("blog-article.css")) {
    html = html.replace(
      /<link rel="stylesheet" href="\/assets\/site\.css">/i,
      `<link rel="stylesheet" href="/assets/site.css">\n${BLOG_ARTICLE_CSS}`,
    );
  }
  html = html.replace(
    /<link rel="stylesheet" href="\/assets\/content-page\.css">\s*/gi,
    "",
  );
  html = html.replace(
    /<link rel="stylesheet" href="\/assets\/marketing-diagram\.css">\s*/gi,
    "",
  );
  if (!html.includes("blog-article-page")) {
    if (/<body class="/.test(html)) {
      html = html.replace(/<body class="([^"]*)">/i, '<body class="$1 blog-article-page">');
    } else {
      html = html.replace(/<body>/i, '<body class="blog-article-page">');
    }
  }
  return html;
}

function shouldContentPageChrome(rel) {
  if (CONTENT_PAGE_SKIP.has(rel)) return false;
  if (rel.startsWith("blog/")) return false;
  if (rel.startsWith("auth/")) return false;
  if (rel.startsWith("app/")) return false;
  if (rel.startsWith("templates/")) return false;
  return (
    rel.startsWith("diagram-tool-for-") ||
    rel.includes("-tool/") ||
    rel.includes("-maker/") ||
    rel.includes("-builder/") ||
    rel === "about/index.html" ||
    rel === "contact/index.html" ||
    rel === "faq/index.html" ||
    rel === "business-financial-mapping/index.html"
  );
}

const FINANCIAL_MAPPING_CSS = `<link rel="stylesheet" href="/assets/financial-mapping.css">`;

function ensureFinancialMappingChrome(html, rel) {
  if (rel !== "business-financial-mapping/index.html") return html;
  if (!html.includes("financial-mapping.css")) {
    html = html.replace(
      /<link rel="stylesheet" href="\/assets\/content-page\.css">/i,
      `<link rel="stylesheet" href="/assets/content-page.css">\n${FINANCIAL_MAPPING_CSS}`,
    );
  }
  if (!html.includes("financial-mapping-page")) {
    if (/<body class="/.test(html)) {
      html = html.replace(
        /<body class="([^"]*)">/i,
        (m, cls) =>
          cls.includes("financial-mapping-page")
            ? m
            : `<body class="${cls} financial-mapping-page">`,
      );
    } else {
      html = html.replace(/<body>/i, '<body class="financial-mapping-page">');
    }
  }
  return html;
}

function ensureContentPageChrome(html, rel) {
  if (!shouldContentPageChrome(rel)) return html;
  if (!html.includes("content-page.css")) {
    html = html.replace(
      /<link rel="stylesheet" href="\/assets\/site\.css">/i,
      `<link rel="stylesheet" href="/assets/site.css">\n${CONTENT_PAGE_CSS}`,
    );
  }
  if (html.includes('class="content-page"') || html.includes("class='content-page'"))
    return html;
  if (/<body class="/.test(html)) {
    return html.replace(
      /<body class="([^"]*)">/i,
      '<body class="$1 content-page">',
    );
  }
  return html.replace(/<body>/i, '<body class="content-page">');
}

let n = 0;
for (const full of walk(ROOT)) {
  const rel = relPath(full);
  if (skipRel(rel)) continue;
  let html = readFileSync(full, "utf8");
  const orig = html;
  html = ensureHeadChrome(html, rel);
  html = ensureContentPageChrome(html, rel);
  html = ensureBlogArticleChrome(html, rel);
  html = ensureFinancialMappingChrome(html, rel);
  html = ensureViewportCharset(html);
  html = applyNav(html, navHtml);
  html = stripShareDock(html, rel);
  html = applyMegaFooter(html, rel);
  html = injectSocial(html, rel);
  html = html.replace(/https:\/\/your-domain\.com\//g, `${BASE}/`);
  html = injectFab(html, rel);
  html = ensureSiteShell(html, rel);
  html = stripInlineThemeHandlers(html);
  if (html !== orig) {
    writeFileSync(full, html, "utf8");
    console.log("synced", rel);
    n++;
  }
}
console.log(`sync-marketing-shell: ${n} files updated`);
