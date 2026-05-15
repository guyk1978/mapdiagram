import fs from "node:fs";
import path from "node:path";

const dir = "templates/flowchart";
const slugs = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));

function pageShell({ title, description, canonical, body, ctaHref, ctaLabel }) {
  return `<!doctype html>
<html lang="en">
<head>
  <script src="/assets/site-analytics.js" defer></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://mapdiagram.com/assets/ui-preview.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
</head>
<body>
<header class="nav nav--minimal"><div class="wrap"><a href="/" class="nav-brand"><strong>MapDiagram</strong></a>
<nav class="links nav-links-main"><a href="/flowchart-templates/">Templates</a><a href="/ai-flowchart-generator/">AI Generator</a><a class="btn nav-cta" href="/app/">Open editor</a></nav></div></header>
<main class="wrap" style="padding:32px 0 48px;max-width:720px">${body}
<p style="margin-top:28px"><a class="btn nav-cta" href="${ctaHref}">${ctaLabel}</a></p></main>
<footer class="wrap" style="padding:24px 0 40px;opacity:.75;font-size:14px"><a href="/">MapDiagram</a> — professional flowcharts online.</footer>
</body>
</html>`;
}

fs.mkdirSync("ai-flowchart-generator", { recursive: true });
fs.writeFileSync(
  "ai-flowchart-generator/index.html",
  pageShell({
    title: "AI Flowchart Generator | MapDiagram",
    description: "Generate professional flowcharts from plain English. Edit, export PNG, and publish shareable links.",
    canonical: "https://mapdiagram.com/ai-flowchart-generator/",
    ctaHref: "/app/?prompt=approval",
    ctaLabel: "Generate a flowchart free",
    body: `<h1>AI Flowchart Generator</h1>
<p>Describe your process in plain language. MapDiagram turns it into a polished, editable flowchart — with decision branches, revision loops, and presentation-ready layout.</p>
<h2>How it works</h2>
<ol><li>Open the editor and describe your workflow</li><li>Review and refine nodes on the canvas</li><li>Export PNG or publish a public link</li></ol>
<h2>Best for</h2>
<ul><li>Approval and review workflows</li><li>Support escalation paths</li><li>Onboarding and operations</li></ul>
<p><a href="/flowchart-templates/">Browse flowchart templates</a> or <a href="/flowchart-maker/">learn about the flowchart maker</a>.</p>`,
  }),
);

fs.mkdirSync("flowchart-templates", { recursive: true });
const cards = slugs
  .map((slug) => {
    const t = JSON.parse(fs.readFileSync(path.join(dir, slug + ".json"), "utf8"));
    return `<li><a href="/templates/flowchart/${slug}/"><strong>${t.title}</strong></a> — ${t.description}</li>`;
  })
  .join("\n");
fs.writeFileSync(
  "flowchart-templates/index.html",
  pageShell({
    title: "Flowchart Templates | MapDiagram",
    description: "Ready-made flowchart templates for onboarding, approvals, support, releases, and more.",
    canonical: "https://mapdiagram.com/flowchart-templates/",
    ctaHref: "/app/",
    ctaLabel: "Start from a blank canvas",
    body: `<h1>Flowchart templates</h1>
<p>Jump-start real business workflows. Each template opens instantly in the editor — customize labels, add branches, then export or publish.</p>
<ul>${cards}</ul>`,
  }),
);

for (const slug of slugs) {
  const t = JSON.parse(fs.readFileSync(path.join(dir, slug + ".json"), "utf8"));
  const outDir = path.join("templates", "flowchart", slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "index.html"),
    pageShell({
      title: `${t.title} Flowchart Template | MapDiagram`,
      description: t.description,
      canonical: `https://mapdiagram.com/templates/flowchart/${slug}/`,
      ctaHref: `/app/?template=${slug}`,
      ctaLabel: `Use ${t.title} template`,
      body: `<h1>${t.title}</h1>
<p>${t.description}</p>
<p><strong>Category:</strong> ${t.category}. <strong>Tags:</strong> ${(t.tags || []).join(", ")}.</p>
<p>Starter prompt: <em>${t.promptSeed}</em></p>
<p><a href="/flowchart-templates/">All templates</a> · <a href="/ai-flowchart-generator/">AI generator</a></p>`,
    }),
  );
}
console.log("SEO pages:", slugs.length + 2);
