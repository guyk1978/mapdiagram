/**
 * ContentPageTemplate — type definitions and documentation for micro-hub pages.
 * Runtime HTML builders live in `scripts/lib/content-page-template.mjs`.
 */

export type AccentColor = "blue" | "green" | "yellow" | "red";
export type VisualKind = "nodes" | "flow" | "map" | "grid" | "compare";

export interface ContentHubHeroProps {
  eyebrow: string;
  title: string;
  lead: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export interface ContentHubSectionProps {
  title: string;
  bodyHtml: string;
  accent?: AccentColor;
  visual?: VisualKind;
  reverse?: boolean;
  stack?: boolean;
}

export interface ContentHubFeatureCard {
  title: string;
  desc: string;
  accent?: AccentColor;
  icon?: string;
}

export interface ContentHubFeatureGridProps {
  heading: string;
  intro?: string;
  cards: ContentHubFeatureCard[];
}

export interface ContentHubCtaProps {
  title: string;
  text: string;
  button: string;
  href?: string;
}

export interface ResourceHubSectionProps {
  introHtml?: string;
  landingsHtml: string;
  guidesHtml: string;
  coreHtml?: string;
  footerNote?: string;
}

export interface DiagramSpotlightProps {
  compact?: boolean;
}

/** Blog article layout: see assets/blog-article.css and scripts/lib/blog-article-template.mjs */

/**
 * Apply on static HTML pages:
 * - `<body class="content-page">`
 * - `<link rel="stylesheet" href="/assets/content-page.css">`
 * - `<main class="content-hub">` with sections from content-page-template.mjs
 */
