/**
 * Hardcode JoinMyPDF + CalnexApp partner links in every footer-meta row.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PARTNER_LINKS = `<a href="https://joinmypdf.com/" rel="noopener noreferrer" target="_blank">Export workflow as PDF → JoinMyPDF</a>
      <span class="footer-partner-sep" aria-hidden="true">·</span>
      <a href="https://calnexapp.com/" rel="noopener noreferrer" target="_blank">Model Loan Repayments → CalnexApp</a>`;

const OLD_PATTERNS = [
  /<a href="https:\/\/joinmypdf\.com\/" rel="noopener noreferrer" target="_blank">Export workflow as PDF → JoinMyPDF<\/a>/g,
  /<a href="https:\/\/joinmypdf\.com\/" rel="noopener noreferrer" target="_blank">Export workflow as PDF ➔ JoinMyPDF<\/a>/g,
];

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

function footerMetaBlock(html) {
  const m = html.match(/<div class="footer-meta">[\s\S]*?<\/div>/);
  return m ? m[0] : null;
}

function injectIntoFooterMeta(html) {
  const block = footerMetaBlock(html);
  if (!block || block.includes("calnexapp.com")) return html;

  if (block.includes('href="/">Home</a>')) {
    return html.replace(
      /(<div class="footer-meta">[\s\S]*?)(<a href="\/">Home<\/a>)/,
      `$1${PARTNER_LINKS}\n      $2`,
    );
  }

  return html.replace(/<div class="footer-meta">([\s\S]*?)<\/div>/, `<div class="footer-meta">$1${PARTNER_LINKS}\n    </div>`);
}

let updated = 0;
for (const file of walk(ROOT)) {
  let html = readFileSync(file, "utf8");
  const orig = html;

  for (const re of OLD_PATTERNS) {
    html = html.replace(re, PARTNER_LINKS);
  }

  html = injectIntoFooterMeta(html);

  if (html !== orig) {
    writeFileSync(file, html, "utf8");
    updated++;
  }
}

console.log(`Done. ${updated} files updated.`);
