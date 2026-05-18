/** Cluster membership for internal linking graph */
export const GROUPS = {
  developers: [
    "developers",
    "software-engineers",
    "backend-developers",
    "frontend-developers",
    "devops-engineers",
    "system-architects",
    "mobile-developers",
    "full-stack-developers",
    "open-source-maintainers",
    "api-designers",
    "engineering-managers",
    "tech-leads",
    "qa-engineers",
    "security-engineers",
    "data-engineers",
  ],
  business: [
    "product-managers",
    "startup-founders",
    "project-managers",
    "business-analysts",
    "operations-teams",
    "executives",
    "consultants",
    "sales-teams",
    "customer-success-teams",
    "finance-teams",
  ],
  education: [
    "students",
    "teachers",
    "universities",
    "researchers",
    "coding-bootcamps",
    "online-learners",
    "stem-educators",
    "instructional-designers",
  ],
  marketing: [
    "marketers",
    "seo-specialists",
    "content-creators",
    "agencies",
    "freelancers",
    "growth-teams",
    "brand-managers",
    "social-media-managers",
  ],
  workflow: [
    "small-business",
    "remote-teams",
    "startups-workflow",
    "productivity-users",
    "planning-teams",
    "cross-functional-teams",
    "design-teams",
    "legal-teams",
    "healthcare-teams",
  ],
};

export const SLUG_TO_GROUP = Object.fromEntries(
  Object.entries(GROUPS).flatMap(([g, slugs]) => slugs.map((s) => [s, g])),
);

function hashSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/** Five related landing slugs: peers + cross-cluster bridges */
export function relatedSlugs(slug) {
  const g = SLUG_TO_GROUP[slug];
  const peers = GROUPS[g].filter((s) => s !== slug);
  const out = [];
  out.push(...peers.slice(0, 3));

  const cross = {
    developers: ["product-managers", "system-architects"],
    business: ["developers", "startup-founders"],
    education: ["teachers", "students"],
    marketing: ["seo-specialists", "content-creators"],
    workflow: ["remote-teams", "product-managers"],
  }[g];

  for (const x of cross) {
    if (!out.includes(x) && x !== slug) out.push(x);
  }

  const deduped = [...new Set(out)];
  if (deduped.length < 5) {
    for (const p of peers) {
      if (deduped.length >= 5) break;
      if (!deduped.includes(p)) deduped.push(p);
    }
  }
  return deduped.slice(0, 5);
}

const POOL = {
  developers: [
    "how-developers-design-systems",
    "system-design-for-beginners",
  ],
  business: ["product-managers-workflow-guide", "startup-planning-tools"],
  education: ["teachers-visual-lesson-planning", "mind-map-vs-flowchart-explained"],
  marketing: ["marketers-visual-content-planning", "top-ai-tools-for-diagrams"],
  workflow: ["remote-collaboration-diagrams", "visual-thinking-for-productivity"],
};

const ALT = {
  developers: "api-architecture-diagrams-guide",
  business: "customer-journey-mapping-basics",
  education: "visual-thinking-for-productivity",
  marketing: "best-diagram-tools-2026",
  workflow: "agile-sprint-planning-diagrams",
};

/** Two blog slugs per landing page */
export function blogSlugsForLanding(slug) {
  const g = SLUG_TO_GROUP[slug];
  const [a, b] = POOL[g];
  const alt = ALT[g];
  if (hashSlug(slug) % 2 === 0) return [a, b];
  return [a, alt];
}
