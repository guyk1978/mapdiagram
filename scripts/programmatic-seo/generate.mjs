import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { GROUPS, relatedSlugs, blogSlugsForLanding } from "./groups.mjs";
import { LANDINGS_DEVELOPERS } from "./landings-developers.mjs";
import { LANDINGS_BUSINESS } from "./landings-business.mjs";
import { LANDINGS_EDUCATION } from "./landings-education.mjs";
import { LANDINGS_MARKETING } from "./landings-marketing.mjs";
import { LANDINGS_WORKFLOW } from "./landings-workflow.mjs";
import { BLOGS } from "./blogs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const BASE = "https://mapdiagram.com";

const LANDINGS = [
  ...LANDINGS_DEVELOPERS,
  ...LANDINGS_BUSINESS,
  ...LANDINGS_EDUCATION,
  ...LANDINGS_MARKETING,
  ...LANDINGS_WORKFLOW,
];

const CORE_MONEY_PAGES = [
  "developers",
  "software-engineers",
  "system-architects",
  "product-managers",
  "startup-founders",
  "startups-workflow",
  "seo-specialists",
];

const MONEY_PAGE_CONTENT = {
  developers: {
    builtForTitle: "Built for backend and platform engineering teams",
    builtForText:
      "MapDiagram helps developers map service boundaries, async workers, and incident paths without maintaining heavyweight diagram files. It works well for teams running REST APIs, GraphQL gateways, and mixed cloud workloads where architecture changes every sprint.",
    workflows: [
      "Map microservices dependencies across Docker containers and Kubernetes workloads",
      "Visualize Kafka event pipelines, retry logic, dead-letter queues, and async workers",
      "Document Redis cache reads/writes next to PostgreSQL transactional paths",
      "Share observability runbooks linking traces, metrics, and failure domains",
    ],
    demoTitle: "Visualize backend dependencies in minutes",
    demoText:
      "Open a browser canvas, drop services, queues, and data stores, then share the map in code review or incident response without export friction.",
    scenarios: [
      "When debugging async failures across services and queue consumers",
      "When onboarding a new engineer to a distributed system",
      "When aligning API owners before a breaking contract change",
      "When preparing postmortems with clear timeline and dependency context",
    ],
    ctaPrimary: "Map your backend architecture",
    ctaSecondary: "Open the developer workspace",
  },
  "software-engineers": {
    builtForTitle: "Built for software engineers shipping across layers",
    builtForText:
      "Use MapDiagram to connect frontend flows, service contracts, and data dependencies in one place. It is built for practical engineering decisions, not just static presentation diagrams.",
    workflows: [
      "Capture feature flow from UI event to REST API and database write",
      "Map deployment and rollback paths with environment-specific checks",
      "Visualize queue processing, retries, and error handling policies",
      "Align observability alerts with ownership and remediation paths",
    ],
    demoTitle: "Go from idea to implementation-ready map quickly",
    demoText:
      "Create architecture diagrams during planning meetings, then keep them up to date as pull requests change reality.",
    scenarios: [
      "When reviewing technical design options with your team",
      "When decomposing a monolith into services incrementally",
      "When documenting edge cases before release hardening",
      "When mentoring new hires on system context",
    ],
    ctaPrimary: "Design engineering workflows",
    ctaSecondary: "Start mapping technical systems",
  },
  "system-architects": {
    builtForTitle: "Built for system architects and technical leaders",
    builtForText:
      "MapDiagram supports architecture work where trust boundaries, data flow, and scalability tradeoffs matter. Use it to align engineering, product, and security stakeholders with a single visual source of truth.",
    workflows: [
      "Model service boundaries, data residency zones, and trust domains",
      "Map event-driven architecture with Kafka topics and consumer groups",
      "Compare synchronous REST paths versus async queue-based designs",
      "Document Kubernetes cluster topology and observability coverage",
    ],
    demoTitle: "Present architecture decisions with clarity",
    demoText:
      "Build a clean target-state diagram and a migration path diagram, then use both in design reviews and roadmap planning.",
    scenarios: [
      "When deciding between monolithic and distributed service boundaries",
      "When aligning teams on platform migration strategy",
      "When documenting reliability architecture before scale events",
      "When communicating technical risk to product leadership",
    ],
    ctaPrimary: "Map system architecture decisions",
    ctaSecondary: "Open architecture workspace",
  },
  "product-managers": {
    builtForTitle: "Built for product organizations coordinating execution",
    builtForText:
      "MapDiagram helps PMs make roadmap dependencies explicit, align stakeholder expectations, and reduce ambiguity between Jira workflows, engineering scope, and launch plans.",
    workflows: [
      "Map sprint planning dependencies across squads and shared services",
      "Visualize roadmap sequencing with delivery risk and ownership",
      "Document launch workflows spanning product, engineering, and GTM",
      "Track stakeholder mapping for decision checkpoints and approvals",
    ],
    demoTitle: "Design product workflows your team can actually run",
    demoText:
      "Turn planning conversations into visual execution maps so everyone understands critical path, blockers, and next decisions.",
    scenarios: [
      "When aligning PMs and developers before a release",
      "When reprioritizing roadmap items after new customer feedback",
      "When clarifying cross-team ownership ahead of launch",
      "When translating OKRs into milestone-level execution plans",
    ],
    ctaPrimary: "Design your product workflow",
    ctaSecondary: "Open planning workspace",
  },
  "startup-founders": {
    builtForTitle: "Built for startup founders driving fast execution",
    builtForText:
      "Founders use MapDiagram to convert strategy into concrete execution maps. It is useful when product scope, growth loops, and hiring plans evolve quickly and need one shared visual model.",
    workflows: [
      "Map MVP scope, dependencies, and launch checkpoints",
      "Visualize growth loops across acquisition, activation, and retention",
      "Plan stakeholder communication for investors and internal teams",
      "Track roadmap tradeoffs against runway and team capacity",
    ],
    demoTitle: "Visualize startup execution, not just ideas",
    demoText:
      "Create one map for what ships now and one for what scales next, then keep both synchronized with weekly planning.",
    scenarios: [
      "When preparing launch planning for a new product surface",
      "When aligning engineering and GTM around one milestone",
      "When deciding which roadmap dependency to cut first",
      "When onboarding new hires into startup operating cadence",
    ],
    ctaPrimary: "Visualize startup execution",
    ctaSecondary: "Open founder workspace",
  },
  "startups-workflow": {
    builtForTitle: "Built for startup teams running cross-functional workflows",
    builtForText:
      "MapDiagram gives startup teams a shared visual workspace for sprint planning, launch execution, and day-to-day coordination across product, engineering, and operations.",
    workflows: [
      "Map weekly sprint planning and delivery dependencies",
      "Track launch workflow with owner-by-owner accountability",
      "Visualize product backlog to go-to-market handoff paths",
      "Align growth experiments with product and analytics instrumentation",
    ],
    demoTitle: "Coordinate startup workflows in one visual layer",
    demoText:
      "Use one map for execution status, blockers, and ownership so decisions happen faster in standups and planning sessions.",
    scenarios: [
      "When coordinating a fast release across small teams",
      "When handoffs between product and operations create delays",
      "When growth experiments require engineering dependencies",
      "When establishing repeatable workflows during team growth",
    ],
    ctaPrimary: "Plan startup team workflows",
    ctaSecondary: "Open startup workflow board",
  },
  "seo-specialists": {
    builtForTitle: "Built for SEO specialists and content architecture teams",
    builtForText:
      "MapDiagram helps SEO teams map topic clusters, internal linking paths, crawl depth, and information architecture so technical SEO and content strategy stay aligned.",
    workflows: [
      "Design topic clusters and semantic SEO hubs by search intent",
      "Map internal linking flows between money pages and supporting content",
      "Visualize crawl structure and click-depth for key templates",
      "Coordinate keyword mapping across content, product, and dev teams",
    ],
    demoTitle: "Plan your SEO site structure visually",
    demoText:
      "Build architecture maps before publishing at scale to avoid orphan pages, weak authority flow, and fragmented keyword targeting.",
    scenarios: [
      "When restructuring internal linking for commercial-intent pages",
      "When planning new topic clusters and pillar pages",
      "When auditing crawl depth and indexation risk",
      "When aligning SEO strategy with product roadmap constraints",
    ],
    ctaPrimary: "Plan your SEO site structure",
    ctaSecondary: "Open SEO architecture workspace",
  },
};

const GTAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-LDVB4978S7"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-LDVB4978S7');
</script>`;

function head({ title, description, canonicalPath }) {
  return `<!doctype html>
<html lang="en">
<head>
${GTAG}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${BASE}${canonicalPath}">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="manifest" href="/assets/site.webmanifest">
</head>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteHeader() {
  return `<header class="nav">
  <div class="wrap">
  <a href="/" style="color:inherit;text-decoration:none"><strong>MapDiagram</strong></a>
  <nav class="links">
  <a href="/">Home</a>
  <a href="/faq/">FAQ</a>
  <a href="/diagram-builder/">Tools</a>
  <a href="/blog/">Blog</a>
  <a href="/about/">About</a>
  <a href="/auth/">Login</a>
  <a class="btn" href="/app/">Open App</a>
  </nav>
  </div>
  </header>`;
}

function landingCompareTable(L) {
  const angle = esc(
    `${L.label} teams usually need diagrams that stay easy to update while priorities shift—MapDiagram is built for that pace.`,
  );
  const rowMap = esc(
    `Emphasizes clarity for ${L.label}: quick structure in the browser, then iterate as decisions land.`,
  );
  return `<p class="lead">${angle}</p>
<div class="compare-wrap" role="region" aria-label="MapDiagram compared to traditional diagram tools">
<table class="compare">
  <thead><tr><th>Capability</th><th>Traditional diagram suites</th><th>MapDiagram</th></tr></thead>
  <tbody>
    <tr><td>Time to first diagram</td><td>Often slowed by templates, licensing, and setup</td><td>Browser-first workflow built for quick structure</td></tr>
    <tr><td>Collaboration</td><td>Frequently file-centric or role-gated</td><td>Designed around shareable maps stakeholders can follow</td></tr>
    <tr><td>Iteration speed</td><td>Formatting can dominate early thinking</td><td>Encourages fast drafts that evolve with decisions</td></tr>
    <tr><td>Audience fit</td><td>Optimized for specialists</td><td>Built for mixed teams: product, ops, marketing, and engineering</td></tr>
    <tr><td>AI-assisted thinking</td><td>Varies widely by vendor</td><td>${rowMap}</td></tr>
  </tbody>
</table>
</div>`;
}

function moneyPageCompareTable(L, C) {
  return `<div class="compare-wrap" role="region" aria-label="Why teams switch to MapDiagram">
<table class="compare">
  <thead><tr><th>Why teams switch</th><th>Traditional tools</th><th>MapDiagram</th></tr></thead>
  <tbody>
    <tr><td>Iteration speed</td><td>Diagram maintenance becomes overhead after each sprint change</td><td>Browser-first editing keeps architecture maps current while requirements move</td></tr>
    <tr><td>Workflow clarity</td><td>Disconnected files make handoffs and ownership hard to track</td><td>Shared visual workspace connects dependencies, owners, and release decisions</td></tr>
    <tr><td>Technical detail</td><td>Hard to model queues, async workers, APIs, and observability paths clearly</td><td>Maps complex systems using practical technical language teams already use</td></tr>
    <tr><td>Collaboration</td><td>Review cycles are slow and file-based</td><td>Fast link sharing supports product, engineering, and operations alignment</td></tr>
    <tr><td>Trust and adoption</td><td>Diagrams drift and lose credibility quickly</td><td>Used for planning complex systems with low-friction updates and clear ownership</td></tr>
  </tbody>
</table>
</div>
<p class="muted">Built for ${esc(L.label)} teams that need less friction and more execution clarity.</p>`;
}

function buildFooterHtml() {
  const col = (title, links) => {
    const items = links
      .map(
        (l) =>
          `      <li><a href="${l.href}">${esc(l.label)}</a></li>`,
      )
      .join("\n");
    return `    <div class="footer-col">
      <h3 class="footer-heading">${esc(title)}</h3>
      <ul class="footer-list">
${items}
      </ul>
    </div>`;
  };

  const ordered = (slugs) => {
    const priority = slugs.filter((s) => CORE_MONEY_PAGES.includes(s));
    const rest = slugs.filter((s) => !CORE_MONEY_PAGES.includes(s));
    return [...priority, ...rest];
  };

  const dev = ordered(GROUPS.developers).map((slug) => ({
    href: `/diagram-tool-for-${slug}/`,
    label: LANDINGS.find((x) => x.slug === slug).label,
  }));
  const biz = ordered(GROUPS.business).map((slug) => ({
    href: `/diagram-tool-for-${slug}/`,
    label: LANDINGS.find((x) => x.slug === slug).label,
  }));
  const startups = ordered([
    "startup-founders",
    "startups-workflow",
    "small-business",
    "remote-teams",
  ]).map((slug) => ({
    href: `/diagram-tool-for-${slug}/`,
    label: LANDINGS.find((x) => x.slug === slug).label,
  }));
  const edu = ordered(GROUPS.education).map((slug) => ({
    href: `/diagram-tool-for-${slug}/`,
    label: LANDINGS.find((x) => x.slug === slug).label,
  }));
  const mkt = ordered(GROUPS.marketing).map((slug) => ({
    href: `/diagram-tool-for-${slug}/`,
    label: LANDINGS.find((x) => x.slug === slug).label,
  }));
  const wf = ordered(GROUPS.workflow).map((slug) => ({
    href: `/diagram-tool-for-${slug}/`,
    label: LANDINGS.find((x) => x.slug === slug).label,
  }));
  const blogLinks = BLOGS.map((b) => ({
    href: `/blog/${b.slug}/`,
    label: b.title.replace(/\s*\|\s*MapDiagram\s*$/, ""),
  }));

  const blocks = [
    col("Developers", dev),
    col("Business", biz),
    col("Startups", startups),
    col("Education", edu),
    col("Marketing", mkt),
    col("Workflow tools", wf),
    col(
      "Blog",
      blogLinks.map((b) => ({ href: b.href, label: b.label })),
    ),
    col("App", [{ href: "/app/", label: "Open MapDiagram" }]),
  ].join("\n");

  return `<footer class="footer">
  <div class="wrap footer-inner">
    <div class="footer-grid">
${blocks}
    </div>
    <div class="footer-meta">
      <span class="muted">© MapDiagram</span>
      <a href="/privacy-policy/">Privacy Policy</a>
      <a href="/terms/">Terms</a>
      <a href="/contact/">Contact</a>
      <a href="/">Home</a>
    </div>
  </div>
</footer>`;
}

function buildCompactFooterHtml() {
  const coreLinks = CORE_MONEY_PAGES.map((slug) => {
    const L = LANDINGS.find((x) => x.slug === slug);
    return `<li><a href="/diagram-tool-for-${slug}/">${esc(L.label)}</a></li>`;
  }).join("\n");
  const blogLinks = BLOGS.slice(0, 5)
    .map((b) => `<li><a href="/blog/${b.slug}/">${esc(b.title.replace(/\s*\|\s*MapDiagram\s*$/, ""))}</a></li>`)
    .join("\n");
  return `<footer class="footer">
  <div class="wrap footer-inner">
    <div class="footer-grid">
      <div class="footer-col">
        <h3 class="footer-heading">Core tools</h3>
        <ul class="footer-list">${coreLinks}</ul>
      </div>
      <div class="footer-col">
        <h3 class="footer-heading">Guides</h3>
        <ul class="footer-list">${blogLinks}</ul>
      </div>
      <div class="footer-col">
        <h3 class="footer-heading">App</h3>
        <ul class="footer-list">
          <li><a href="/app/">Open MapDiagram</a></li>
          <li><a href="/blog/">Browse blog</a></li>
          <li><a href="/contact/">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-meta">
      <span class="muted">Fast browser-based mapping for technical and business teams.</span>
    </div>
  </div>
</footer>`;
}

function relatedLandingList(slugs) {
  return slugs
    .map((s) => {
      const L = LANDINGS.find((x) => x.slug === s);
      return `        <li><a href="/diagram-tool-for-${s}/">${esc(L.label)}</a></li>`;
    })
    .join("\n");
}

function blogLinkList(slugs) {
  return slugs
    .map((s) => {
      const b = BLOGS.find((x) => x.slug === s);
      const label = b.title.replace(/\s*\|\s*MapDiagram\s*$/, "");
      return `        <li><a href="/blog/${s}/">${esc(label)}</a></li>`;
    })
    .join("\n");
}

function landingLinkBySlug(slug, customLabel) {
  const L = LANDINGS.find((x) => x.slug === slug);
  return `<a href="/diagram-tool-for-${slug}/">${esc(customLabel || L.label)}</a>`;
}

function coreMoneyForLanding(slug) {
  if (GROUPS.developers.includes(slug)) {
    return slug === "system-architects" ? "developers" : "system-architects";
  }
  if (GROUPS.business.includes(slug)) {
    return slug === "product-managers" ? "startup-founders" : "product-managers";
  }
  if (GROUPS.education.includes(slug)) return "developers";
  if (GROUPS.marketing.includes(slug)) {
    return slug === "seo-specialists" ? "product-managers" : "seo-specialists";
  }
  if (GROUPS.workflow.includes(slug)) {
    return slug === "startups-workflow" ? "product-managers" : "startups-workflow";
  }
  return "developers";
}

function coreMoneyForBlog(B) {
  const primary =
    B.landings.find((s) => CORE_MONEY_PAGES.includes(s)) || "developers";
  const secondary =
    ["product-managers", "startup-founders", "system-architects", "seo-specialists"].find(
      (s) => s !== primary,
    ) || "product-managers";
  return [primary, secondary];
}

function screenshotContextForSlug(slug) {
  if (["developers", "software-engineers", "system-architects", "backend-developers", "devops-engineers", "api-designers"].includes(slug)) {
    return {
      title: "Architecture canvas preview",
      caption: "System boundaries, APIs, services, and data flows mapped in one visual workspace.",
      align: "align-right",
    };
  }
  if (["seo-specialists", "marketers", "growth-teams", "content-creators"].includes(slug)) {
    return {
      title: "Topical map and internal linking preview",
      caption: "Use visual clusters to design authority flow and reduce orphan-page risk.",
      align: "align-center",
    };
  }
  if (["startup-founders", "startups-workflow", "product-managers", "project-managers", "planning-teams"].includes(slug)) {
    return {
      title: "Collaborative workflow preview",
      caption: "Map planning, execution, and ownership transitions without breaking momentum.",
      align: "align-center",
    };
  }
  return {
    title: "MapDiagram visual preview",
    caption: "Fast browser-based diagramming for architecture, workflows, and process mapping.",
    align: "",
  };
}

function screenshotBlock(slug) {
  const c = screenshotContextForSlug(slug);
  return `<div class="product-shot ${c.align}">
  <figure>
    <img src="/assets/ui-preview.svg" alt="${esc(c.title)}" loading="lazy" decoding="async" width="1280" height="720">
    <figcaption>${esc(c.caption)}</figcaption>
  </figure>
</div>`;
}

function landingPageHtml(L) {
  const path = `/diagram-tool-for-${L.slug}/`;
  const rel = relatedSlugs(L.slug);
  const blogs = blogSlugsForLanding(L.slug);
  const core = coreMoneyForLanding(L.slug);
  const moneyContent = MONEY_PAGE_CONTENT[L.slug];
  const useCases = L.useCases.map((t) => `        <li>${esc(t)}</li>`).join("\n");
  const workflows = moneyContent
    ? moneyContent.workflows.map((t) => `<li>${esc(t)}</li>`).join("\n")
    : "";
  const scenarios = moneyContent
    ? moneyContent.scenarios.map((t) => `<li>${esc(t)}</li>`).join("\n")
    : "";

  if (moneyContent) {
    const visual = screenshotBlock(L.slug);
    const visualAfterWorkflows = ["developers", "software-engineers", "system-architects", "seo-specialists"].includes(L.slug);
    const visualAfterScenarios = ["startup-founders", "startups-workflow", "product-managers"].includes(L.slug);
    return `${head({
      title: L.title,
      description: L.description,
      canonicalPath: path,
    })}
<body>
${siteHeader()}
  <main class="wrap">
    <section class="hero">
      <h1>${esc(L.h1)}</h1>
      <p class="lead">${esc(L.hero)}</p>
      <div class="links" style="margin-top:14px">
        <a class="btn cta" href="/app/">${esc(moneyContent.ctaPrimary)}</a>
        <a class="btn cta" href="/app/" style="background:var(--panel);color:var(--text);border:1px solid var(--line)">${esc(moneyContent.ctaSecondary)}</a>
      </div>
      <p class="muted" style="margin-top:12px">Trusted as a shared visual workspace for planning complex systems and cross-functional execution.</p>
    </section>

    <section class="section card">
      <h2>${esc(moneyContent.builtForTitle)}</h2>
      <p class="lead">${esc(moneyContent.builtForText)}</p>
    </section>

    <section class="section">
      <h2>Common workflows mapped in MapDiagram</h2>
      <div class="card">
        <ul>${workflows}</ul>
      </div>
      ${visualAfterWorkflows ? visual : ""}
    </section>

    <section class="section">
      <h2>${esc(moneyContent.demoTitle)}</h2>
      <p class="lead">${esc(moneyContent.demoText)}</p>
      <div class="grid">
        <div class="card"><h3>Screenshot placeholder</h3><p class="muted">Product canvas view: nodes, connectors, and grouped system areas.</p></div>
        <div class="card"><h3>Diagram preview card</h3><p class="muted">Preview architecture map with APIs, queues, databases, and observability links.</p></div>
        <div class="card"><h3>Mock UI area</h3><p class="muted">Toolbar, map canvas, and collaboration panel in a browser-first layout.</p></div>
      </div>
      ${!visualAfterWorkflows && !visualAfterScenarios ? visual : ""}
    </section>

    <section class="section">
      <h2>Why teams switch from traditional diagram tools</h2>
      ${moneyPageCompareTable(L, moneyContent)}
    </section>

    <section class="section">
      <h2>Real-world scenarios</h2>
      <div class="card"><ul>${scenarios}</ul></div>
      ${visualAfterScenarios ? visual : ""}
    </section>

    <section class="section">
      <h2>Start diagramming in MapDiagram</h2>
      <p class="lead"><strong>Problem:</strong> ${esc(L.problem)}</p>
      <p class="lead"><strong>Solution:</strong> ${esc(L.solution)}</p>
      <a class="btn cta" href="/app/">${esc(moneyContent.ctaPrimary)}</a>
    </section>

    <section class="section related" aria-label="Related pages">
      <h2>Related landing pages</h2>
      <ul>
${relatedLandingList(rel)}
      </ul>
      <h2>Related guides</h2>
      <ul>
${blogLinkList(blogs)}
      </ul>
      <h2>Core money page</h2>
      <p class="lead">${landingLinkBySlug(core)} is a priority MapDiagram page for high-intent visitors and product-led conversion paths.</p>
      <p class="muted" style="margin-top:14px">Explore more on the <a href="/blog/">MapDiagram blog</a> or jump straight into the <a href="/app/">editor</a>.</p>
    </section>
  </main>
${buildCompactFooterHtml()}
</body>
</html>
`;
  }

  return `${head({
    title: L.title,
    description: L.description,
    canonicalPath: path,
})}
<body>
${siteHeader()}
  <main class="wrap">
    <section class="hero">
      <h1>${esc(L.h1)}</h1>
      <p class="lead">${esc(L.hero)}</p>
      <a class="btn cta" href="/app/">Open MapDiagram</a>
    </section>

    <section class="section">
      <h2>Problem → solution</h2>
      <p class="lead"><strong>Problem:</strong> ${esc(L.problem)}</p>
      <p class="lead"><strong>Solution:</strong> ${esc(L.solution)}</p>
    </section>

    <section class="section">
      <h2>Use cases for ${esc(L.label)}</h2>
      <ul>
${useCases}
      </ul>
      ${(GROUPS.developers.includes(L.slug) || GROUPS.workflow.includes(L.slug) || GROUPS.marketing.includes(L.slug)) ? screenshotBlock(L.slug) : ""}
    </section>

    <section class="section">
      <h2>How AI-assisted diagramming helps</h2>
      <p class="lead">${esc(L.ai)}</p>
    </section>

    <section class="section">
      <h2>MapDiagram vs traditional diagram tools</h2>
      ${landingCompareTable(L)}
    </section>

    <section class="section">
      <h2>Start diagramming in MapDiagram</h2>
      <p class="lead">Open the app to build a clean map you can share, iterate, and align around—without installing heavyweight software.</p>
      <a class="btn cta" href="/app/">Launch the app</a>
    </section>

    <section class="section related" aria-label="Related pages">
      <h2>Related landing pages</h2>
      <ul>
${relatedLandingList(rel)}
      </ul>
      <h2>Related guides</h2>
      <ul>
${blogLinkList(blogs)}
      </ul>
      <h2>Core money page</h2>
      <p class="lead">${landingLinkBySlug(core)} is a priority MapDiagram page for high-intent visitors and product-led conversion paths.</p>
      <p class="muted" style="margin-top:14px">Explore more on the <a href="/blog/">MapDiagram blog</a> or jump straight into the <a href="/app/">editor</a>.</p>
    </section>
  </main>
${buildFooterHtml()}
</body>
</html>
`;
}

function wrapFirstCompareTable(html) {
  const one = html.includes('<table class="compare"');
  if (!one) return html;
  return html
    .replace("<table class=\"compare\"", '<div class="compare-wrap"><table class="compare"')
    .replace("</table>", "</table></div>");
}

function blogPageHtml(B) {
  const path = `/blog/${B.slug}/`;
  const bodyHtml = wrapFirstCompareTable(B.body);
  const [corePrimary, coreSecondary] = coreMoneyForBlog(B);
  return `${head({
    title: B.title,
    description: B.description,
    canonicalPath: path,
})}
<body>
${siteHeader()}
  <main class="wrap">
    <article class="article">
      <h1>${esc(B.title.replace(/\s*\|\s*MapDiagram\s*$/, ""))}</h1>
      <p class="lead">${esc(B.description)}</p>
      ${bodyHtml}
      <h2>Most important tools</h2>
      <ul>
        <li>${landingLinkBySlug(corePrimary, "System Design Tool for Developers")}</li>
        <li>${landingLinkBySlug(coreSecondary, "Workflow Tool for Product Managers and Startup Teams")}</li>
      </ul>
      <h2>Try MapDiagram</h2>
      <p class="lead">If you want a fast browser-based workspace for maps, flow thinking, and structured visuals, open MapDiagram and build your next diagram alongside your doc—not instead of it.</p>
      <a class="btn cta" href="/app/">Open MapDiagram</a>
    </article>
  </main>
${buildFooterHtml()}
</body>
</html>
`;
}

function writeSitemap(urls) {
  const body = urls
    .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  writeFileSync(join(ROOT, "sitemap.xml"), xml, "utf8");
}

function main() {
  if (LANDINGS.length !== 50) {
    throw new Error(`Expected 50 landings, got ${LANDINGS.length}`);
  }
  if (BLOGS.length !== 15) {
    throw new Error(`Expected 15 blogs, got ${BLOGS.length}`);
  }

  const footerOnly = buildFooterHtml();
  mkdirSync(join(ROOT, "partials"), { recursive: true });
  writeFileSync(join(ROOT, "partials", "footer.html"), footerOnly + "\n", "utf8");

  for (const L of LANDINGS) {
    const dir = join(ROOT, `diagram-tool-for-${L.slug}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), landingPageHtml(L), "utf8");
  }

  for (const B of BLOGS) {
    const dir = join(ROOT, "blog", B.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), blogPageHtml(B), "utf8");
  }

  const staticUrls = [
    `${BASE}/`,
    `${BASE}/app/`,
    `${BASE}/auth/`,
    `${BASE}/auth/callback/`,
    `${BASE}/about/`,
    `${BASE}/contact/`,
    `${BASE}/privacy-policy/`,
    `${BASE}/terms/`,
    `${BASE}/faq/`,
    `${BASE}/diagram-builder/`,
    `${BASE}/flowchart-maker/`,
    `${BASE}/mind-map-tool/`,
    `${BASE}/family-tree-maker/`,
    `${BASE}/process-mapping-tool/`,
    `${BASE}/workflow-builder/`,
    `${BASE}/system-design-tool/`,
    `${BASE}/idea-mapping-tool/`,
    `${BASE}/visual-planning-tool/`,
    `${BASE}/org-chart-maker/`,
    `${BASE}/network-diagram-tool/`,
    `${BASE}/uml-diagram-tool/`,
    `${BASE}/decision-tree-maker/`,
    `${BASE}/customer-journey-map/`,
    `${BASE}/data-flow-diagram-tool/`,
    `${BASE}/business-process-diagram-tool/`,
    `${BASE}/free-diagram-tool/`,
    `${BASE}/blog/`,
  ];

  const landingUrls = LANDINGS.map(
    (L) => `${BASE}/diagram-tool-for-${L.slug}/`,
  );
  const blogUrls = BLOGS.map((b) => `${BASE}/blog/${b.slug}/`);

  writeSitemap([...staticUrls, ...landingUrls, ...blogUrls]);

  patchRootFooters();
  patchHomepageMoneySection();

  console.log(
    `Wrote ${LANDINGS.length} landing pages, ${BLOGS.length} blog posts, partials/footer.html, sitemap.xml`,
  );
}

function patchRootFooters() {
  const footer = buildFooterHtml();
  const targets = [join(ROOT, "index.html"), join(ROOT, "blog", "index.html")];
  for (const p of targets) {
    let html = readFileSync(p, "utf8");
    html = html.replace(/<footer class="footer">[\s\S]*?<\/footer>/, footer);
    writeFileSync(p, html, "utf8");
  }
}

function patchHomepageMoneySection() {
  const p = join(ROOT, "index.html");
  let html = readFileSync(p, "utf8");
  if (html.includes('id="most-important-tools"')) return;
  const section = `
<section class="section" id="most-important-tools">
  <h2>Most Important Tools</h2>
  <p class="lead">Start with these high-intent pages designed to convert professional traffic into active MapDiagram users.</p>
  <div class="grid">
    <a class="card" href="/diagram-tool-for-system-architects/"><h3>System Design Tool for Developers</h3><p>Architecture mapping for software teams and technical leaders.</p></a>
    <a class="card" href="/diagram-tool-for-product-managers/"><h3>Workflow Tool for Product Managers</h3><p>Map initiatives, dependencies, and delivery workflows clearly.</p></a>
    <a class="card" href="/diagram-tool-for-startup-founders/"><h3>Startup Planning Diagram Tool</h3><p>Turn startup strategy into execution-ready visual plans.</p></a>
    <a class="card" href="/diagram-tool-for-seo-specialists/"><h3>SEO Site Structure Diagram Tool</h3><p>Build topical authority maps and internal-link architecture.</p></a>
    <a class="card" href="/diagram-tool-for-software-engineers/"><h3>Software Engineering Architecture Tool</h3><p>Visualize systems, dependencies, and service boundaries faster.</p></a>
    <a class="card" href="/diagram-tool-for-startups-workflow/"><h3>Startup Workflow Planning Tool</h3><p>Coordinate product, operations, and launch execution paths.</p></a>
  </div>
</section>
`;
  html = html.replace(
    /<section class="section">\s*<h2>Popular Diagram Use Cases<\/h2>/,
    `${section}\n<section class="section">\n  <h2>Popular Diagram Use Cases</h2>`,
  );
  writeFileSync(p, html, "utf8");
}

main();
