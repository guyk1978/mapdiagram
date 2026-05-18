# MapDiagram programmatic SEO — internal linking map

## Core money pages

- `/diagram-tool-for-system-architects/`
- `/diagram-tool-for-developers/`
- `/diagram-tool-for-software-engineers/`
- `/diagram-tool-for-product-managers/`
- `/diagram-tool-for-startup-founders/`
- `/diagram-tool-for-startups-workflow/`
- `/diagram-tool-for-seo-specialists/`

## Principles

- **Landing pages** (`/diagram-tool-for-{slug}/`) each link to **five** related audience landings, **two** blog posts, **one core money page**, and CTAs to **`/app/`**.
- **Blog posts** (`/blog/{slug}/`) each include **three contextual landing links** in post content, plus a "Most important tools" section with **two core money-page links**, and a CTA to **`/app/`**.
- **Homepage** includes a dedicated "Most Important Tools" block that prioritizes core money pages with keyword-forward anchors.
- **Footer** is ordered by SEO priority and now includes a dedicated **Startups** group; money pages are listed first in their clusters.

## Authority flow graph

`Homepage → Core Money Pages → Supporting Cluster Pages → Blog Posts → Core Money Pages`

This creates bidirectional reinforcement for high-commercial-intent URLs while preserving topical breadth.

## Cluster graph (high level)

1. **Developers ↔ architecture ↔ product ↔ startups**  
   Developer landings pull cross-links toward `product-managers` and `system-architects`; business landings pull back toward `developers` and `startup-founders`.

2. **Education ↔ students ↔ teachers**  
   Education cluster cross-links emphasize `students` and `teachers` so institutional and individual learning pages reinforce each other.

3. **Marketing ↔ SEO ↔ content**  
   Marketing cluster cross-links emphasize `seo-specialists` and `content-creators` for topical relevance.

4. **Workflow ↔ remote ↔ planning**  
   Workflow landings cross-link toward `remote-teams` and `product-managers` to connect execution and coordination intent.

## Implementation

- Related landings are generated in `scripts/programmatic-seo/groups.mjs` (`relatedSlugs`).
- Blog pairs per landing are generated in the same module (`blogSlugsForLanding` + cluster pools).
- Core money-page routing for each landing and blog is enforced in `scripts/programmatic-seo/generate.mjs` (`coreMoneyForLanding`, `coreMoneyForBlog`).
- Footer prioritization and homepage money-section injection are handled in `scripts/programmatic-seo/generate.mjs`.
- The mega-footer is emitted to `partials/footer.html` and inlined into generated pages plus root pages.

## SEO health checks

- Duplicate titles: `0`
- Duplicate meta descriptions: `0`
- Orphan landing/blog pages: `0`

Measured via `scripts/programmatic-seo/audit.mjs`.

## Regeneration

From the repo root:

```bash
node scripts/programmatic-seo/generate.mjs
```

This rebuilds all 50 landings, all 15 blogs, `partials/footer.html`, `sitemap.xml`, and refreshes footers on the home page and blog index.

## Folder structure

```text
mapdiagram/
├── assets/
│   └── site.css                 # Shared styles (incl. footer grid, compare tables, article)
├── blog/
│   ├── index.html               # Blog hub (15 posts + mega-footer)
│   └── {slug}/index.html        # 15 generated articles
├── diagram-tool-for-{audience}/
│   └── index.html               # 50 audience landings
├── partials/
│   └── footer.html              # Shared footer HTML (also inlined by generator)
├── scripts/
│   └── programmatic-seo/
│       ├── generate.mjs         # Builds landings, blogs, sitemap, footer partial, patches root footers
│       ├── groups.mjs           # Clusters + relatedSlugs() + blogSlugsForLanding()
│       ├── blogs.mjs            # 15 posts (copy + embedded tables + internal landings)
│       ├── landings-developers.mjs
│       ├── landings-business.mjs
│       ├── landings-education.mjs
│       ├── landings-marketing.mjs
│       └── landings-workflow.mjs
├── seo/
│   └── INTERNAL_LINKING.md      # This document
├── sitemap.xml                  # Regenerated (includes landings + blogs + core URLs)
└── index.html                   # Home (mega-footer patched by generator)
```
