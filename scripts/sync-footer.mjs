/**
 * Propagate partials/footer.html to every static page that includes the mega-footer.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

function relPath(full) {
  return relative(ROOT, full).replace(/\\/g, "/");
}

function skipRel(rel) {
  return rel === "app/tool.html" || rel === "partials/footer.html";
}

const footerHtml = readFileSync(join(ROOT, "partials", "footer.html"), "utf8").trim();
const footerRe = /<footer class="footer">[\s\S]*?<\/footer>/;

let n = 0;
for (const full of walk(ROOT)) {
  const rel = relPath(full);
  if (skipRel(rel)) continue;
  let html = readFileSync(full, "utf8");
  if (!footerRe.test(html)) continue;
  const next = html.replace(footerRe, footerHtml);
  if (next !== html) {
    writeFileSync(full, next, "utf8");
    n++;
  }
}

console.log(`sync-footer: ${n} files updated`);
