# Phase 1 — Safety & Audit Report (MapDiagram.com)

**Date:** 2026-05-14  
**Scope:** All non-editor site surfaces (marketing, blog, hubs, auth shell, legal, shared assets, SEO infrastructure).  
**Explicitly out of scope:** `/app/tool.html` and any editor logic, UI, or behavior — not opened for review beyond noting presence of shared snippets from automated grep.

**Phase 1 rule:** No visual or code changes were made in this phase. This document is the sole deliverable for Phase 1.

---

## 1. Repository surface (HTML)

| Metric | Approx. count / note |
|--------|----------------------|
| Total `*.html` files | 95 (includes `partials/footer.html`, `app/tool.html`) |
| Full “page” HTML (excluding `partials/footer.html` and `app/tool.html`) | 93 |
| Pages with `rel="canonical"` | 65 |
| Pages **without** `rel="canonical"` (excluding partial + editor) | **~28** hub/marketing/shell/legal pages |

**Pages observed without canonical** (non-exhaustive; verify before Phase 3): root `index.html`, `about/`, `contact/`, `faq/`, `blog/index.html`, `diagram-builder/`, `workflow-builder/`, `app/index.html`, `auth/` + `auth/callback/`, `terms/`, `privacy-policy/`, and the standalone product landings such as `flowchart-maker/`, `mind-map-tool/`, `uml-diagram-tool/`, `business-process-diagram-tool/`, `free-diagram-tool/`, `org-chart-maker/`, `customer-journey-map/`, `data-flow-diagram-tool/`, `decision-tree-maker/`, `family-tree-maker/`, `idea-mapping-tool/`, `network-diagram-tool/`, `process-mapping-tool/`, `system-design-tool/`, `visual-planning-tool/`, etc.

**Programmatic cluster** (`/diagram-tool-for-*/` and individual `/blog/{slug}/`): canonical present in sampled files (generator-aligned).

---

## 2. Google Analytics (gtag.js)

- **Pattern:** Full “Google tag (gtag.js)” block (async loader + inline `gtag` config for `G-LDVB4978S7`) is **copy-pasted per HTML file**.
- **Scale:** `googletagmanager.com/gtag/js` appears in **~92** HTML files (essentially every page including `app/index.html` and `app/tool.html`).
- **Risk:** Maintenance drift, duplicate execution if pages are composed oddly, no single source of truth. Phase 5 should deduplicate via one include or build step **without** changing measurement behavior unintentionally.

---

## 3. Open Graph, Twitter cards, social meta

- **Grep** for `property="og:`, `name="twitter:`, and loose `og:/twitter:card` across `*.html` and key `*.md`: **no matches**.
- **Conclusion:** Sitewide OG/Twitter metadata is **missing or non-standard** in static HTML. Phase 3 should add tags in `<head>` per page type (home, article, product landing).

---

## 4. Inline styles

### 4.1 `<style>` blocks in `<head>` or body

| File (non-editor) | Notes |
|-------------------|--------|
| `index.html` | `.product-preview` block; **`background: transparent(...)` is invalid CSS** (likely intended `linear-gradient`) — visual/perf risk |
| `app/index.html` | Shell page — inline styles present |
| `auth/index.html` | Inline styles |
| `workflow-hub/index.html` | Page-scoped hero/layout styles |
| `business-process-diagram-tool/index.html` | Inline `<style>` block |

`app/tool.html` also contains `<style>` (out of scope to modify).

### 4.2 `style="..."` attributes

- **Widespread** on programmatic audience landings (`diagram-tool-for-*`) and **blog posts** (e.g. logo link `color:inherit`, CTA rows, secondary buttons).
- **`index.html`:** inline styles on hero logo `<img>` and elsewhere.
- **`app/tool.html`:** very high count of inline styles (**editor** — do not refactor in this program).

**Phase 2 target:** move patterns into `/assets/site.css` or small page-scoped CSS files; retain justified exceptions only if documented.

---

## 5. Shared CSS & design tokens

- **`/assets/site.css`:** imports `design-tokens.css` and `share-dock.css`; defines layout, nav, hero, cards, article, footer grid.
- **Token drift:** `site.css` still uses **literal hex colors** in places (e.g. link color `#a8c0ff`, body fallback stack) alongside `var(--muted)` etc. Phase 2 should align literals to tokens where safe.
- **Unused CSS:** not measured with a purge tool in Phase 1; recommend **conservative** removal in Phase 4/5 after class inventory (avoid breaking dynamic or rarely used classes).

---

## 6. Navigation & footer patterns

### Navigation

- **Duplication:** Each HTML file inlines its own `<header class="nav">` block; there is **no single partial** for the main nav (unlike footer).
- **Drift example:**  
  - **`index.html`:** Home, FAQ, Tools, Workflow Hub, Blog, About, **Login**, Open App.  
  - **`about/index.html`:** Home, Tools, Workflow Hub, Blog, About, Open App — **omits FAQ and Login**; logo is not linked the same way as blog/landing pages.
- **Blog / audience landings** often use `<a href="/" style="color:inherit..."><strong>MapDiagram</strong></a>` vs home using plain `<strong>MapDiagram</strong>`.

**Phase 2/5:** one nav template or generator injection for all non-editor pages.

### Footer

- **`partials/footer.html`** exists and is documented in `seo/INTERNAL_LINKING.md` as the mega-footer source for generator + key pages.
- **Risk:** manually maintained pages can **drift** from `partials/footer.html` unless regenerated or synced.

---

## 7. Headings (H1) — spot audit

- Sampled pages (`index.html`, `about/index.html`, `faq/index.html`, `blog/best-diagram-tools-2026/index.html`) each expose **a single clear `<h1>`** in main content.
- **Phase 3 follow-up:** full automated pass (exactly one H1 per URL, logical H2/H3 order) across all 93 pages; blog templates and long legal pages are higher risk.

---

## 8. Structured data (JSON-LD)

| Type | Where seen (grep) |
|------|-------------------|
| `FAQPage` | `faq/index.html` |
| `application/ld+json` (WebApplication / BreadcrumbList style) | Many standalone **tool** landings (e.g. `flowchart-maker`, `uml-diagram-tool`, `diagram-builder`, …) |
| **`BlogPosting`** | **No `@type":"BlogPosting"`** matches in `*.html` at audit time |

**Gap:** Blog articles should get `BlogPosting` (+ `publisher`/`author` as appropriate) in Phase 3. Homepage may need `Organization` and optional `WebSite` + `SearchAction` if product decision allows.

---

## 9. Performance & assets (initial risks)

| Item | Detail |
|------|--------|
| **Hero / product imagery** | Homepage uses a **large PNG** with a long generated filename under `/assets/` — consider WebP/AVIF, consistent naming, and explicit dimensions (partially present on home hero). |
| **Invalid CSS** | `index.html` `.product-preview` background (see §4.1) may cause unnecessary repaint or ignored rule. |
| **`share-dock.js`** | Loaded from `/shared/share-dock.js` on **most** marketing/auth/legal/blog/hub pages (defer on many). Editor also loads it (out of scope). Phase 4: load only where UX requires sharing/floating dock. |
| **Caching / versioning** | Not audited at CDN/server layer in Phase 1. Static `/assets/*` should remain cache-friendly; confirm cache headers in hosting config; if absent, add **query-string or filename versioning** in Phase 4 without breaking URLs. |

---

## 10. Internal linking & SEO docs

- **`seo/INTERNAL_LINKING.md`** describes intended graph: audience landings ↔ blog ↔ core money pages ↔ `/app/`, footer ordering, generator paths (`scripts/programmatic-seo/*.mjs`).
- **Implementation** is generator-driven for **50 landings + 15 blogs** + footer refresh.
- **Phase 3 task:** ensure “money” blocks and contextual links from that doc are **visible in HTML** on hub pages (`index.html`, `blog/index.html`) after any template change — manual review recommended.

---

## 11. `app/index.html` (shell only — future phases)

- Allowed later: iframe **safety attributes**, **accessibility** on shell chrome, meta/link hygiene.
- **Forbidden:** changing iframe URL logic, editor messaging, or anything inside `tool.html`.

---

## 12. Risks & constraints for Phases 2–6

1. **Do not edit** `/app/tool.html`.  
2. Avoid URL changes and auth/Stripe/Supabase behavior unless explicitly approved.  
3. **Regenerator:** changing `scripts/programmatic-seo/generate.mjs` affects many files at once — batch carefully and re-run audit scripts if present.  
4. **SEO indexation:** add canonical/OG without removing or renaming indexed paths.  
5. **GTAG dedupe:** prefer one build-time include or server-side include so counts stay correct in GA.

---

## 13. Phase 1 completion checklist

- [x] Non-editor pages scanned (patterns: canonical, gtag, OG, inline style, share-dock, JSON-LD).  
- [x] Duplicate nav/footer / meta gaps documented.  
- [x] Performance risks flagged (images, invalid CSS, ubiquitous scripts).  
- [x] Design token / CSS centralization gaps noted.  
- [x] **`/reports/audit-phase-1.md`** written.  
- [x] **No code or visual changes** in Phase 1.

---

## 14. Recommended Phase 2 entry order

1. Fix **invalid** `.product-preview` CSS on `index.html` when moving to `site.css`.  
2. Extract repeated `<style>` blocks from `workflow-hub`, `auth`, `business-process-diagram-tool`, `app/index` shell.  
3. Normalize nav markup to one pattern; link logo consistently.  
4. Reduce inline `style=""` on **generator-owned** templates first (highest leverage).

---

*End of Phase 1 audit.*
