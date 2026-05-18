import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name === "index.html") files.push(p);
  }
}

walk(ROOT);

const titleMap = new Map();
const metaMap = new Map();
const urlToInbound = new Map();

for (const f of files) {
  const html = readFileSync(f, "utf8");
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
  const meta =
    (html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || "";
  if (title) {
    if (!titleMap.has(title)) titleMap.set(title, []);
    titleMap.get(title).push(f);
  }
  if (meta) {
    if (!metaMap.has(meta)) metaMap.set(meta, []);
    metaMap.get(meta).push(f);
  }
}

const landingFiles = files.filter((f) => f.includes("diagram-tool-for-"));
const blogFiles = files.filter((f) => f.includes(`${join("blog", "")}`) && !f.endsWith(`${join("blog", "index.html")}`));
const landingSlugs = landingFiles.map((f) =>
  f.match(/diagram-tool-for-([^\\/]+)[\\/]index\.html$/)?.[1],
).filter(Boolean);
const blogSlugs = blogFiles.map((f) =>
  f.match(/[\\/]blog[\\/]([^\\/]+)[\\/]index\.html$/)?.[1],
).filter(Boolean);

for (const s of landingSlugs) urlToInbound.set(`/diagram-tool-for-${s}/`, 0);
for (const s of blogSlugs) urlToInbound.set(`/blog/${s}/`, 0);

for (const f of files) {
  const html = readFileSync(f, "utf8");
  for (const u of urlToInbound.keys()) {
    const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`href="${escaped}"`).test(html)) {
      urlToInbound.set(u, urlToInbound.get(u) + 1);
    }
  }
}

const dupTitles = [...titleMap.values()].filter((v) => v.length > 1).length;
const dupMeta = [...metaMap.values()].filter((v) => v.length > 1).length;
const orphans = [...urlToInbound.entries()].filter(([, c]) => c === 0).map(([u]) => u);

console.log(
  JSON.stringify(
    {
      total_index_pages: files.length,
      landing_pages: landingSlugs.length,
      blog_posts: blogSlugs.length,
      duplicate_titles: dupTitles,
      duplicate_meta_descriptions: dupMeta,
      orphan_count: orphans.length,
      orphan_urls: orphans,
    },
    null,
    2,
  ),
);
