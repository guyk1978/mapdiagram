/**
 * Blog article layout — hero, prose, callouts, pull quotes.
 */
import { esc } from "./content-page-template.mjs";

export const BLOG_ARTICLE_CSS = `<link rel="stylesheet" href="/assets/blog-article.css">`;

export function blogArticleHero({ title, dek, category, catKey, dateIso, dateLabel, readingMin }) {
  return `<header class="article-hero">
      <p class="article-hero__eyebrow"><a href="/blog/">MapDiagram Blog</a></p>
      <h1 class="article-hero__title">${title}</h1>
      <p class="article-hero__dek">${dek}</p>
      <div class="article-meta" aria-label="Article metadata">
        <span class="article-meta__cat article-meta__cat--${catKey}">${esc(category)}</span>
        <span class="article-meta__sep" aria-hidden="true">·</span>
        <time class="article-meta__date" datetime="${esc(dateIso)}">${esc(dateLabel)}</time>
        <span class="article-meta__sep" aria-hidden="true">·</span>
        <span class="article-meta__reading">${readingMin} min read</span>
      </div>
    </header>`;
}

export function blogArticleFooter({ corePrimary, coreSecondary, primaryLabel, secondaryLabel }) {
  return `<footer class="article-footer">
      <div class="article-footer__tools">
        <h2 class="article-footer__heading">Most important tools</h2>
        <ul class="article-footer__list">
          <li>${corePrimary}</li>
          <li>${coreSecondary}</li>
        </ul>
      </div>
      <div class="article-footer__cta">
        <h2 class="article-footer__heading">Try MapDiagram</h2>
        <p class="article-footer__lede">Open the editor and turn your next idea into a clear, shareable diagram.</p>
        <a class="btn btn--accent-blue cta" href="/app/">Open editor — free</a>
      </div>
    </footer>`;
}

/** Enrich generated body HTML with callouts and pull quotes. */
export function enhanceBlogBody(html) {
  let out = html.trim();

  out = out.replace(
    /<h2>\s*Bottom line\s*<\/h2>\s*<p>([\s\S]*?)<\/p>/gi,
    `<div class="article-callout article-callout--tip">
      <span class="article-callout__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.2 4.5-3 6l-1 5H9l-1-5c-1.8-1.5-3-3.5-3-6a7 7 0 0 1 7-7z" stroke="currentColor" stroke-width="2"/><path d="M9.5 21h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </span>
      <div class="article-callout__body">
        <p class="article-callout__label">Bottom line</p>
        <p>$1</p>
      </div>
    </div>`,
  );

  out = out.replace(
    /<h2>\s*([^<]*[Cc]omparison[^<]*)\s*<\/h2>/g,
    '<h2 class="article-h2 article-h2--blue">$1</h2>',
  );

  out = out.replace(/<h2>(?![^>]*class=)/g, '<h2 class="article-h2">');
  out = out.replace(/<h3>(?![^>]*class=)/g, '<h3 class="article-h3">');

  out = out.replace(
    /<p>(\s*<strong>[^<]{24,140}<\/strong>\s*)<\/p>/,
    '<blockquote class="article-pullquote">$1</blockquote>',
  );

  out = out.replace(
    /<h3[^>]*>\s*Related pages\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/gi,
    '<div class="article-related"><h3 class="article-related__heading">Related pages</h3><ul class="article-related__list">$1</ul></div>',
  );

  return out;
}
