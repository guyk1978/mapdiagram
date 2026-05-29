/**
 * Transform legacy tool money pages (diagram-builder, flowchart-maker, …)
 * into content-hub micro-landing layout.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  accentAt,
  contentHubBodyClose,
  contentHubBodyOpen,
  contentHubCallout,
  contentHubCta,
  contentHubFaq,
  contentHubFeatureGrid,
  contentHubHero,
  contentHubSection,
  CONTENT_PAGE_CSS,
  visualSvg,
  wrapContentHub,
} from "./lib/content-page-template.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const TOOL_SLUGS = [
  "diagram-builder",
  "flowchart-maker",
  "mind-map-tool",
  "system-design-tool",
  "process-mapping-tool",
  "workflow-builder",
  "visual-planning-tool",
  "uml-diagram-tool",
  "data-flow-diagram-tool",
  "network-diagram-tool",
  "business-process-diagram-tool",
  "decision-tree-maker",
  "customer-journey-map",
  "org-chart-maker",
  "family-tree-maker",
  "idea-mapping-tool",
  "free-diagram-tool",
];

const VISUAL_BY_TITLE = [
  [/flowchart|flow|how.*work|step/i, "flow"],
  [/mind|brain|idea/i, "map"],
  [/vs|compare|advantage/i, "compare"],
  [/who|build with|related/i, "grid"],
  [/what you can|types|build/i, "nodes"],
];

function pickVisual(title, index) {
  for (const [re, kind] of VISUAL_BY_TITLE) {
    if (re.test(title)) return kind;
  }
  return ["nodes", "flow", "map", "compare", "grid"][index % 5];
}

function slugToEyebrow(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function slugToCtaLabel(slug) {
  if (slug === "diagram-builder") return "Start building";
  const name = slugToEyebrow(slug);
  return `Open ${name}`;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseIntro(block) {
  const h1m = block.match(/<h1>([\s\S]*?)<\/h1>/i);
  if (!h1m) return null;
  const title = h1m[1].trim();
  const rest = block.replace(/<h1>[\s\S]*?<\/h1>/i, "").trim();
  const paragraphs = [...rest.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((m) => m[1].trim());
  const lead = paragraphs.slice(0, 2).join(" ");
  return { title, lead };
}

function parseH3Cards(body) {
  const cards = [];
  const chunks = body.split(/<h3>/i).slice(1);
  for (const chunk of chunks) {
    const titleEnd = chunk.indexOf("</h3>");
    if (titleEnd < 0) continue;
    const title = chunk.slice(0, titleEnd).trim();
    const after = chunk.slice(titleEnd + 5);
    const pm = after.match(/<p>([\s\S]*?)<\/p>/i);
    const desc = pm ? pm[1].trim() : stripTags(after).slice(0, 120);
    if (title) cards.push({ title, desc });
  }
  return cards;
}

function isFeatureGridSection(title, body) {
  if (/what you can|types of|build with/i.test(title)) return true;
  const h3 = (body.match(/<h3>/gi) || []).length;
  const h2 = (body.match(/<h2>/gi) || []).length;
  return h3 >= 3 && h2 === 0;
}

function isBenefitsSection(title, body) {
  return /benefit|advantage|why use/i.test(title) || /<h3>[^<]*(benefit|advantage)/i.test(body);
}

function visualForSection(title, index) {
  return pickVisual(title, index);
}

function transformMainInner(mainInner, slug) {
  const faqMatch = mainInner.match(
    /<section class="section faq">[\s\S]*?<\/section>/i,
  );
  const faqInner = faqMatch
    ? faqMatch[0]
        .replace(/<section class="section faq">/i, "")
        .replace(/<\/section>\s*$/i, "")
    : "";

  let bodyPart = mainInner
    .replace(/<!--\s*FAQ[\s\S]*/i, "")
    .replace(/<section class="section faq">[\s\S]*?<\/section>/i, "")
    .replace(/\s*<a class="btn cta"[^>]*>[\s\S]*?<\/a>\s*$/i, "");

  const h2Parts = bodyPart.split(/<h2>/i);
  const intro = parseIntro(h2Parts[0]);
  if (!intro) return null;

  const sections = h2Parts.slice(1).map((chunk) => {
    const end = chunk.indexOf("</h2>");
    const title = (end >= 0 ? chunk.slice(0, end) : chunk).trim();
    const body = (end >= 0 ? chunk.slice(end + 5) : "").trim();
    return { title, body };
  });

  const parts = [];
  parts.push(
    contentHubHero({
      eyebrow: slugToEyebrow(slug),
      title: intro.title,
      lead: intro.lead,
      ctaLabel: slugToCtaLabel(slug),
    }),
  );
  parts.push(contentHubBodyOpen());

  let ctaInserted = false;
  sections.forEach((sec, i) => {
    const accent = accentAt(i);
    const visual = visualForSection(sec.title, i);

    if (isFeatureGridSection(sec.title, sec.body)) {
      const introP = sec.body.match(/<p>([\s\S]*?)<\/p>/i);
      const cards = parseH3Cards(sec.body);
      parts.push(
        contentHubFeatureGrid({
          heading: sec.title,
          intro: introP ? introP[1].trim() : "",
          cards: cards.map((c, j) => ({ ...c, accent: accentAt(j) })),
        }),
      );
      return;
    }

    let bodyHtml = sec.body;
    if (isBenefitsSection(sec.title, sec.body)) {
      bodyHtml += contentHubCallout(
        "<strong>Pro tip:</strong> Start with the outcome you need—process clarity, system map, or decision tree—then add detail as the diagram takes shape.",
        "insight",
      );
    }

    parts.push(
      contentHubSection({
        title: sec.title,
        bodyHtml,
        accent,
        visual,
        reverse: i % 2 === 1,
      }),
    );

    if (!ctaInserted && isBenefitsSection(sec.title, sec.body)) {
      parts.push(
        contentHubCta({
          title: "Start building in seconds",
          text: "Open the editor in your browser—no install, no signup friction. Your first diagram is one click away.",
          button: slugToCtaLabel(slug),
        }),
      );
      ctaInserted = true;
    }
  });

  if (!ctaInserted) {
    parts.push(
      contentHubCta({
        title: "Ready to map it visually?",
        text: "Jump into MapDiagram and turn your next idea into a clear, shareable diagram.",
        button: slugToCtaLabel(slug),
      }),
    );
  }

  parts.push(contentHubBodyClose());

  if (faqInner) {
    parts.push(contentHubFaq(faqInner));
  }

  return wrapContentHub(parts.join("\n"));
}

function ensureChrome(html) {
  if (!html.includes("content-page.css")) {
    html = html.replace(
      /<link rel="stylesheet" href="\/assets\/site\.css">/i,
      `<link rel="stylesheet" href="/assets/site.css">\n${CONTENT_PAGE_CSS}`,
    );
  }
  if (!/<body[^>]*class="[^"]*content-page/.test(html)) {
    html = html.replace(/<body>/i, '<body class="content-page">');
    html = html.replace(/<body class="([^"]*)">/i, (m, cls) => {
      if (cls.includes("content-page")) return m;
      return `<body class="${cls} content-page">`;
    });
  }
  return html;
}

let n = 0;
for (const slug of TOOL_SLUGS) {
  const file = join(ROOT, slug, "index.html");
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch {
    console.warn("skip missing", slug);
    continue;
  }

  if (html.includes("content-hub-hero")) {
    console.log("already transformed", slug);
    continue;
  }

  const mainMatch = html.match(/<main class="wrap">([\s\S]*?)<\/main>/i);
  if (!mainMatch) {
    console.warn("no main.wrap", slug);
    continue;
  }

  const newMain = transformMainInner(mainMatch[1], slug);
  if (!newMain) {
    console.warn("transform failed", slug);
    continue;
  }

  html = html.replace(/<main class="wrap">[\s\S]*?<\/main>/i, newMain);
  html = html.replace(/\s*<a class="btn cta" href="\/app\/">[^<]*<\/a>\s*(?=<\/main>)/i, "");
  html = ensureChrome(html);
  writeFileSync(file, html, "utf8");
  console.log("transformed", slug);
  n++;
}

console.log(`transform-tool-money-pages: ${n} pages updated`);
