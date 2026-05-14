# MapDiagram marketing site — execution summary

**Date:** 2026-05-14  
**Scope:** Marketing, blog, programmatic landings, auth shell UI, shared assets, SEO. **Excluded:** `/app/tool.html` and all editor internals (unchanged).

## What changed

- **Single GA4 loader:** Added `/assets/site-analytics.js` and replaced duplicated inline `gtag` blocks across all non-editor HTML. The editor file still contains its original snippet by constraint.
- **Programmatic SEO generator** (`scripts/programmatic-seo/generate.mjs`): Rich `<head>` with canonical, Open Graph, Twitter cards, JSON-LD (`BreadcrumbList` + `WebPage` on landings; `BlogPosting` + breadcrumbs on posts); unified nav (including Workflow Hub + `nav-brand`); removed inline CTA styles in favor of `.hero-actions`, `.btn-secondary`, `.related-footer-note`; JoinMyPDF link in mega-footer meta; `partials/nav.html` emitted beside `partials/footer.html`; `patchRootHeaders()` for home + blog index; sitemap includes `/workflow-hub/`; share-dock script appended on generated landings/blogs.
- **Static HTML sync** (`scripts/sync-marketing-shell.mjs`): Strips legacy gtag where present, applies nav from `partials/nav.html`, injects canonical/OG/Twitter when missing, fixes `your-domain.com` placeholders, adds charset/viewport when absent, replaces auth footers with mega-footer, removes share-dock from `auth/**`.
- **`/assets/site.css`:** Removed global `@import` of share-dock (script self-injects CSS when needed); design tokens for links/brand soft; utility classes (nav, hero, auth, workflow hub, app shell, product preview, buttons); light-theme tweak for `.btn-secondary`.
- **Homepage (`index.html`):** Removed inline `<style>` for product preview (fixed gradient lives in CSS); hero logo uses `.hero-logo` + dimensions; Organization + WebSite JSON-LD; advanced tools heading uses `.section-advanced-tools`.
- **`/app/index.html`:** Shell-only: `class="app-shell-page"` on `<html>`, inline layout CSS removed (uses `site.css`), canonical + social meta, iframe `allow` for clipboard/fullscreen (src unchanged).
- **`/auth/index.html` & `/auth/callback/index.html`:** Auth UI: token-based classes, mega-footer, unified nav on callback, share-dock removed, no Supabase script changes.
- **`/workflow-hub/index.html`:** Page-scoped CSS moved to `site.css` earlier; removed remaining `<style>` block.
- **`/business-process-diagram-tool/index.html`:** Removed duplicate layout `<style>`; added favicon/manifest; schema URLs corrected by sync.

## What was skipped or deferred

- **SearchAction** on homepage WebSite schema: omitted because there is no dedicated site search URL to point at safely.
- **Aggressive asset compression / new raster OG image:** No new binary assets added; OG image remains `ui-preview.svg` sitewide.
- **URL or auth/Stripe/Supabase logic:** Not modified.
- **Editor:** `/app/tool.html` not read or edited; it still loads its own gtag and share-dock as before.

## Risks / notes

- Regenerate with `node scripts/programmatic-seo/generate.mjs` after editing `generate.mjs`; re-run `node scripts/sync-marketing-shell.mjs` if you add new static HTML outside the generator.
- **BlogPosting** dates in the generator are static placeholders (`datePublished` / `dateModified`); refine in `blogs.mjs` later if you need per-post accuracy.

## Files touched (high level)

- `assets/site-analytics.js` (new), `assets/site.css`
- `scripts/programmatic-seo/generate.mjs`, `scripts/sync-marketing-shell.mjs` (new)
- `partials/footer.html`, `partials/nav.html` (generator output)
- `sitemap.xml`, all `diagram-tool-for-*/index.html`, all `blog/*/index.html`
- Static marketing pages updated by sync and manual edits: `index.html`, `app/index.html`, `about/`, `contact/`, `faq/`, `blog/index.html`, `diagram-builder/`, `workflow-hub/`, `workflow-builder/`, tool landings under repo root, `auth/**`, `terms/`, `privacy-policy/`, `business-process-diagram-tool/`, etc.
- `reports/execution-summary.md` (this file)

**Not modified:** `app/tool.html`.
