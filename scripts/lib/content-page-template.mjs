/**
 * ContentPageTemplate — reusable micro-hub HTML builders for static marketing pages.
 * Used by transform scripts and programmatic SEO generation.
 */

const ACCENTS = ["blue", "green", "yellow", "red"];

export function accentAt(index) {
  return ACCENTS[index % ACCENTS.length];
}

export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Abstract diagram visuals (aria-hidden decorative). */
export function visualSvg(kind = "nodes") {
  const svgs = {
    nodes: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect x="24" y="48" width="56" height="36" rx="8" stroke="currentColor" stroke-width="2"/>
      <rect x="108" y="28" width="56" height="36" rx="8" stroke="currentColor" stroke-width="2"/>
      <rect x="128" y="88" width="48" height="32" rx="8" stroke="currentColor" stroke-width="2" opacity=".75"/>
      <path d="M80 66h28M164 46v50h-12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    flow: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect x="70" y="18" width="60" height="32" rx="8" stroke="currentColor" stroke-width="2"/>
      <path d="M100 50v18" stroke="currentColor" stroke-width="2"/>
      <polygon points="100,68 88,88 112,88" stroke="currentColor" stroke-width="2" fill="none"/>
      <rect x="40" y="96" width="50" height="28" rx="6" stroke="currentColor" stroke-width="2"/>
      <rect x="110" y="96" width="50" height="28" rx="6" stroke="currentColor" stroke-width="2"/>
      <path d="M94 82L65 96M106 82l29 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    map: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="100" cy="58" r="10" stroke="currentColor" stroke-width="2"/>
      <circle cx="48" cy="100" r="8" stroke="currentColor" stroke-width="2" opacity=".8"/>
      <circle cx="152" cy="92" r="8" stroke="currentColor" stroke-width="2" opacity=".8"/>
      <path d="M100 68v14M100 82H52M100 82h44" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    grid: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect x="30" y="30" width="140" height="80" rx="10" stroke="currentColor" stroke-width="2"/>
      <path d="M30 70h140M100 30v80" stroke="currentColor" stroke-width="2" opacity=".5"/>
      <circle cx="65" cy="50" r="6" fill="currentColor" opacity=".6"/>
      <circle cx="135" cy="90" r="6" fill="currentColor" opacity=".6"/>
    </svg>`,
    compare: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect x="28" y="40" width="64" height="60" rx="8" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" opacity=".7"/>
      <rect x="108" y="40" width="64" height="60" rx="8" stroke="currentColor" stroke-width="2"/>
      <path d="M92 70h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M108 64l8 6-8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  };
  const inner = svgs[kind] || svgs.nodes;
  return `<div class="content-hub-visual" aria-hidden="true">${inner}</div>`;
}

export function contentHubHero({ eyebrow, title, lead, ctaHref = "/app/", ctaLabel = "Start building" }) {
  return `<header class="content-hub-hero">
  <div class="content-hub-hero__inner wrap">
    <p class="content-hub-hero__eyebrow">${esc(eyebrow)}</p>
    <h1>${title}</h1>
    <p class="lead">${lead}</p>
    <div class="content-hub-hero__actions">
      <a class="btn btn--accent-blue cta" href="${esc(ctaHref)}">${esc(ctaLabel)}</a>
    </div>
  </div>
</header>`;
}

export function contentHubSection({
  title,
  bodyHtml,
  accent = "blue",
  visual = "nodes",
  reverse = false,
  stack = false,
}) {
  const mods = [
    `content-hub-section--accent-${accent}`,
    reverse ? "content-hub-section--reverse" : "",
    stack ? "content-hub-section--stack" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const visualBlock = stack ? "" : visualSvg(visual);
  return `<section class="content-hub-section ${mods}">
  <div class="content-hub-section__prose">
    <h2>${title}</h2>
    ${bodyHtml}
  </div>
  ${visualBlock}
</section>`;
}

export function contentHubCallout(html, variant = "tip") {
  return `<div class="content-hub-callout content-hub-callout--${variant}">${html}</div>`;
}

export function contentHubFeatureGrid({ heading, intro, cards }) {
  const items = cards
    .map(
      (c, i) => `<article class="content-hub-feature content-hub-feature--${c.accent || accentAt(i)}">
  <div class="content-hub-feature__icon" aria-hidden="true">${c.icon || featureIcon(c.accent || accentAt(i))}</div>
  <h3>${c.title}</h3>
  <p>${c.desc}</p>
</article>`,
    )
    .join("\n");
  return `<section class="content-hub-section content-hub-section--stack content-hub-section--accent-blue">
  <div class="content-hub-section__prose">
    <h2 class="content-hub-features-heading">${heading}</h2>
    ${intro ? `<p class="content-hub-features-intro">${intro}</p>` : ""}
    <div class="content-hub-features">${items}</div>
  </div>
</section>`;
}

function featureIcon(accent) {
  const colors = { blue: "4f8fff", green: "34d399", yellow: "fbbf24", red: "ff5c5c" };
  const stroke = colors[accent] || colors.blue;
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="2" stroke="#${stroke}" stroke-width="2"/><rect x="13" y="13" width="7" height="7" rx="2" stroke="#${stroke}" stroke-width="2"/></svg>`;
}

export function contentHubCta({ title, text, button, href = "/app/" }) {
  return `<section class="content-hub-cta" aria-label="Call to action">
  <h2>${title}</h2>
  <p>${text}</p>
  <a class="btn btn--accent-blue cta" href="${esc(href)}">${esc(button)}</a>
</section>`;
}

export function contentHubLinksSection({ title, linksHtml }) {
  return contentHubSection({
    title,
    bodyHtml: `<div class="content-hub-links">${linksHtml}</div>`,
    accent: "yellow",
    visual: "grid",
    stack: true,
  });
}

export function contentHubFaq(faqHtml) {
  return `<section class="content-hub-faq section faq">${faqHtml}</section>`;
}

/**
 * Resource hub — side-by-side related landings + guides with pill links.
 */
export function resourceHubSection({
  introHtml = "",
  landingsHtml,
  guidesHtml,
  coreHtml = "",
  footerNote = 'Explore more on the <a href="/blog/">MapDiagram blog</a> or jump straight into the <a href="/app/">editor</a>.',
}) {
  return `<section class="section resource-hub" aria-label="Resource hub">
${introHtml}
  <div class="resource-hub__grid">
    <div class="resource-hub__card">
      <h3 class="resource-hub__heading">Related landing pages</h3>
      <ul class="resource-hub__list">
${landingsHtml}
      </ul>
    </div>
    <div class="resource-hub__card">
      <h3 class="resource-hub__heading">Related guides</h3>
      <ul class="resource-hub__list">
${guidesHtml}
      </ul>
    </div>
  </div>
  ${
    coreHtml
      ? `<div class="resource-hub__core">
    <div class="resource-hub__core-layout resource-hub__core-layout--split">
      <div class="resource-hub__core-copy">
        <h3 class="resource-hub__heading">Core money page</h3>
        <p class="resource-hub__note">${coreHtml}</p>
        <p class="muted related-footer-note">${footerNote}</p>
      </div>
      ${diagramSpotlightHtml({ compact: true })}
    </div>
  </div>`
      : `<p class="muted related-footer-note">${footerNote}</p>`
  }
</section>`;
}

export function wrapContentHub(innerHtml) {
  return `<main class="content-hub">
${innerHtml}
</main>`;
}

export function contentHubBodyOpen() {
  return `<div class="content-hub-body wrap">`;
}

export function contentHubBodyClose() {
  return `</div>`;
}

/** Head link tag for content-page.css */
export const CONTENT_PAGE_CSS = `<link rel="stylesheet" href="/assets/content-page.css">
<link rel="stylesheet" href="/assets/marketing-diagram.css">`;

let diagramSpotlightUid = 0;

/** Light glass diagram for marketing / core money page sections. */
export function diagramSpotlightHtml({ compact = false } = {}) {
  const uid = ++diagramSpotlightUid;
  const compactClass = compact ? " diagram-spotlight--compact" : "";
  return `<div class="diagram-spotlight${compactClass}" role="img" aria-label="Abstract system flow: API, cache, auth, and client">
  <div class="diagram-spotlight__surface">
    <svg class="diagram-spotlight__svg" viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="diagram-spotlight__path diagram-spotlight__path--a" d="M 52 108 C 96 68 132 68 160 80" />
      <path class="diagram-spotlight__path diagram-spotlight__path--b" d="M 160 80 C 204 96 236 128 260 152" />
      <path class="diagram-spotlight__path diagram-spotlight__path--c" d="M 160 80 C 172 128 142 158 92 160" />
    </svg>
    <div class="diagram-spotlight__node diagram-spotlight__node--blue" tabindex="0" data-spot="${uid}-api"><span>API</span></div>
    <div class="diagram-spotlight__node diagram-spotlight__node--green" tabindex="0" data-spot="${uid}-cache"><span>Cache</span></div>
    <div class="diagram-spotlight__node diagram-spotlight__node--yellow" tabindex="0" data-spot="${uid}-auth"><span>Auth</span></div>
    <div class="diagram-spotlight__node diagram-spotlight__node--red" tabindex="0" data-spot="${uid}-client"><span>Client</span></div>
  </div>
</div>`;
}
