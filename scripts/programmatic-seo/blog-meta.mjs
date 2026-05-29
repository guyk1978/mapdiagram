/** Blog post display metadata (aligned with blog hub categories). */
export const BLOG_POST_META = {
  "best-diagram-tools-2026": { category: "Tools", catKey: "tools", date: "2026-01-15" },
  "how-developers-design-systems": {
    category: "System design",
    catKey: "system",
    date: "2026-01-18",
  },
  "product-managers-workflow-guide": {
    category: "Workflow",
    catKey: "workflow",
    date: "2026-01-22",
  },
  "how-to-create-flowcharts-fast": {
    category: "Workflow",
    catKey: "workflow",
    date: "2026-01-25",
  },
  "system-design-for-beginners": {
    category: "System design",
    catKey: "system",
    date: "2026-02-01",
  },
  "top-ai-tools-for-diagrams": { category: "Tools", catKey: "tools", date: "2026-02-05" },
  "startup-planning-tools": { category: "Workflow", catKey: "workflow", date: "2026-02-08" },
  "visual-thinking-for-productivity": {
    category: "Productivity",
    catKey: "productivity",
    date: "2026-02-12",
  },
  "mind-map-vs-flowchart-explained": {
    category: "Productivity",
    catKey: "productivity",
    date: "2026-02-15",
  },
  "remote-collaboration-diagrams": {
    category: "Workflow",
    catKey: "workflow",
    date: "2026-02-18",
  },
  "marketers-visual-content-planning": {
    category: "Productivity",
    catKey: "productivity",
    date: "2026-02-22",
  },
  "teachers-visual-lesson-planning": {
    category: "Productivity",
    catKey: "productivity",
    date: "2026-02-25",
  },
  "api-architecture-diagrams-guide": {
    category: "System design",
    catKey: "system",
    date: "2026-03-01",
  },
  "agile-sprint-planning-diagrams": {
    category: "Workflow",
    catKey: "workflow",
    date: "2026-03-05",
  },
  "customer-journey-mapping-basics": {
    category: "Workflow",
    catKey: "workflow",
    date: "2026-03-08",
  },
};

export function formatBlogDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function estimateReadingMinutes(html) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(3, Math.ceil(words / 200));
}
