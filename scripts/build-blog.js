#!/usr/bin/env node
/**
 * K-POKER Blog Build Script
 *
 * Reads markdown files from /blog/posts/*.md, converts to HTML using templates,
 * and writes generated HTML to /blog/<slug>.html. Also generates /blog/index.html
 * (post list) and updates /public/sitemap.xml.
 *
 * Run: node scripts/build-blog.js
 * Auto-run: triggered before vite build via npm scripts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const POSTS_DIR = path.join(ROOT, 'blog', 'posts');
const BLOG_OUT_DIR = path.join(ROOT, 'blog');
const TEMPLATE_POST = path.join(ROOT, 'blog', 'template-post.html');
const TEMPLATE_INDEX = path.join(ROOT, 'blog', 'template-index.html');
const SITEMAP_PATH = path.join(ROOT, 'public', 'sitemap.xml');
const HOMEPAGE_PATH = path.join(ROOT, 'index.html');

const CATEGORY_LABELS = {
  'strategy': '전략',
  'hand-analysis': '핸드 분석',
  'tournament': '토너먼트',
  'glossary': '용어',
  'guide': '가이드',
  'news': '소식',
};

const CATEGORY_ICONS = {
  'strategy': '♠',
  'hand-analysis': '🃏',
  'tournament': '🏆',
  'glossary': '📖',
  'guide': '📘',
  'news': '📣',
};

function calculateReadingTime(text) {
  const koreanChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
  const englishWords = text.replace(/[\uac00-\ud7af]/g, '').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(koreanChars / 500 + englishWords / 200));
  return minutes;
}

function calculateWordCount(text) {
  const stripped = text.replace(/[#*`>\[\]\-_!|]/g, ' ');
  const koreanChars = (stripped.match(/[\uac00-\ud7af]/g) || []).length;
  const englishWords = stripped.replace(/[\uac00-\ud7af]/g, '').split(/\s+/).filter(Boolean).length;
  return koreanChars + englishWords;
}

function formatDateDisplay(isoDate) {
  const d = new Date(isoDate);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value ?? '');
  }
  return out;
}

function collectPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.warn(`[build-blog] No posts directory at ${POSTS_DIR}, skipping.`);
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = [];

  for (const file of files) {
    const fullPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { data: fm, content: mdBody } = matter(raw);

    const slug = fm.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    const title = fm.title || slug;
    const date = fm.date ? new Date(fm.date) : new Date();
    const dateIso = date.toISOString().split('T')[0];
    const dateDisplay = formatDateDisplay(date);
    const category = fm.category || 'guide';
    const categoryLabel = CATEGORY_LABELS[category] || category;
    const excerpt = fm.excerpt || mdBody.replace(/[#*`>\[\]]/g, '').slice(0, 160).replace(/\s+/g, ' ').trim();
    const keywords = (fm.keywords || ['텍사스 홀덤', '온라인 홀덤', 'K-POKER']).join(', ');
    const readingTime = calculateReadingTime(mdBody);
    const wordCount = calculateWordCount(mdBody);

    posts.push({
      slug, title, date, dateIso, dateDisplay,
      category, categoryLabel, excerpt, keywords,
      readingTime, wordCount, mdBody,
    });
  }

  posts.sort((a, b) => b.date - a.date);
  return posts;
}

function buildRelatedPostsHtml(currentPost, allPosts) {
  const others = allPosts.filter(p => p.slug !== currentPost.slug);
  const sameCategory = others.filter(p => p.category === currentPost.category);
  const fillers = others.filter(p => p.category !== currentPost.category);
  const picks = [...sameCategory, ...fillers].slice(0, 3);

  if (picks.length === 0) return '';

  return picks.map(p => `
        <article class="related-card">
          <a href="/blog/${escapeHtml(p.slug)}">
            <span class="related-card-tag">${escapeHtml(p.categoryLabel)}</span>
            <h3 class="related-card-title">${escapeHtml(p.title)}</h3>
            <div class="related-card-meta">
              <span><i class="ph ph-calendar"></i> ${escapeHtml(p.dateDisplay)}</span>
              <span><i class="ph ph-clock"></i> ${p.readingTime}분</span>
            </div>
          </a>
        </article>`).join('\n');
}

function renderPosts(posts) {
  const postTemplate = fs.readFileSync(TEMPLATE_POST, 'utf8');

  for (const p of posts) {
    const contentHtml = marked.parse(p.mdBody);
    const relatedHtml = buildRelatedPostsHtml(p, posts);

    const html = renderTemplate(postTemplate, {
      TITLE: escapeHtml(p.title),
      EXCERPT: escapeHtml(p.excerpt),
      KEYWORDS: escapeHtml(p.keywords),
      SLUG: p.slug,
      DATE_ISO: p.dateIso,
      DATE_DISPLAY: p.dateDisplay,
      CATEGORY: escapeHtml(p.categoryLabel),
      READING_TIME: p.readingTime,
      WORD_COUNT: p.wordCount,
      CONTENT: contentHtml,
      RELATED_POSTS: relatedHtml,
    });

    const outPath = path.join(BLOG_OUT_DIR, `${p.slug}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`[build-blog] Built: /blog/${p.slug}.html`);
  }
}

function buildIndex(posts) {
  const indexTemplate = fs.readFileSync(TEMPLATE_INDEX, 'utf8');

  let postsHtml;
  if (posts.length === 0) {
    postsHtml = `
      <div class="blog-empty" style="grid-column: 1 / -1;">
        <i class="ph ph-book-open"></i>
        <h3 style="margin-top: 15px;">곧 첫 글이 올라옵니다</h3>
        <p>K-POKER 블로그를 준비 중입니다. 매주 새로운 전략과 핸드 분석을 만나보세요.</p>
      </div>
    `;
  } else {
    postsHtml = posts.map(p => `
      <article class="blog-card" data-category="${escapeHtml(p.category)}">
        <a href="/blog/${escapeHtml(p.slug)}">
          <div class="blog-card-thumb">${CATEGORY_ICONS[p.category] || '♠'}</div>
          <div class="blog-card-body">
            <div class="blog-card-meta">
              <span class="blog-card-tag">${escapeHtml(p.categoryLabel)}</span>
              <span><i class="ph ph-calendar"></i> ${escapeHtml(p.dateDisplay)}</span>
              <span><i class="ph ph-clock"></i> ${p.readingTime}분</span>
            </div>
            <h2 class="blog-card-title">${escapeHtml(p.title)}</h2>
            <p class="blog-card-excerpt">${escapeHtml(p.excerpt)}</p>
            <div class="blog-card-footer">읽어보기 <i class="ph ph-arrow-right"></i></div>
          </div>
        </a>
      </article>
    `).join('\n');
  }

  const html = renderTemplate(indexTemplate, { POSTS: postsHtml });
  const outPath = path.join(BLOG_OUT_DIR, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`[build-blog] Built: /blog/index.html (${posts.length} posts)`);
}

function updateSitemap(posts) {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn(`[build-blog] No sitemap at ${SITEMAP_PATH}, skipping update.`);
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  const blogIndexEntry = `  <url>
    <loc>https://kpoker.win/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

  const postEntries = posts.map(p => `  <url>
    <loc>https://kpoker.win/blog/${p.slug}</loc>
    <lastmod>${p.dateIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');

  const allBlogEntries = [blogIndexEntry, postEntries].filter(Boolean).join('\n');

  let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');

  // Remove old auto-generated blog block if exists
  sitemap = sitemap.replace(/\n\s*<!-- BLOG_AUTO_START -->[\s\S]*?<!-- BLOG_AUTO_END -->/g, '');

  // Insert new block right before </urlset>
  sitemap = sitemap.replace(
    '</urlset>',
    `  <!-- BLOG_AUTO_START -->\n${allBlogEntries}\n  <!-- BLOG_AUTO_END -->\n</urlset>`
  );

  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
  console.log(`[build-blog] Updated sitemap.xml with ${posts.length + 1} blog URLs`);
}

function updateHomepage(posts) {
  if (!fs.existsSync(HOMEPAGE_PATH)) {
    console.warn(`[build-blog] No homepage at ${HOMEPAGE_PATH}, skipping injection.`);
    return;
  }

  const latest = posts.slice(0, 3);
  if (latest.length === 0) return;

  const cardsHtml = latest.map(p => `
        <article class="blog-teaser-card">
          <a href="/blog/${escapeHtml(p.slug)}">
            <span class="blog-teaser-tag">${escapeHtml(p.categoryLabel)}</span>
            <h3 class="blog-teaser-title">${escapeHtml(p.title)}</h3>
            <p class="blog-teaser-excerpt">${escapeHtml(p.excerpt)}</p>
            <div class="blog-teaser-meta">
              <span><i class="ph ph-calendar"></i> ${escapeHtml(p.dateDisplay)}</span>
              <span><i class="ph ph-clock"></i> ${p.readingTime}분</span>
            </div>
          </a>
        </article>`).join('\n');

  const sectionHtml = `
    <section class="blog-teaser-section reveal" style="padding: 80px 0; background: #f8fafc;">
      <style>
        .blog-teaser-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; max-width: 1100px; margin: 0 auto; }
        .blog-teaser-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; transition: all 0.3s; overflow: hidden; }
        .blog-teaser-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .blog-teaser-card a { text-decoration: none; color: inherit; display: block; padding: 24px; }
        .blog-teaser-tag { display: inline-block; background: #eff6ff; color: var(--primary); padding: 4px 12px; border-radius: 6px; font-weight: 700; text-transform: uppercase; font-size: 0.7rem; border: 1px solid #dbeafe; margin-bottom: 12px; }
        .blog-teaser-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; line-height: 1.4; margin: 0 0 10px; }
        .blog-teaser-excerpt { font-size: 0.9rem; color: #64748b; line-height: 1.6; margin: 0 0 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .blog-teaser-meta { font-size: 0.8rem; color: #94a3b8; display: flex; gap: 14px; align-items: center; }
      </style>
      <div class="container">
        <div class="text-center" style="margin-bottom: 40px;">
          <span class="pill-badge">최신 블로그</span>
          <h2 class="section-title">실전 전략 · 핸드 분석 · 토너먼트 소식</h2>
          <p class="section-desc">매주 업데이트되는 한국어 텍사스 홀덤 학습 자료실입니다.</p>
        </div>
        <div class="blog-teaser-grid">${cardsHtml}
        </div>
        <div class="text-center" style="margin-top: 36px;">
          <a href="/blog" class="btn-primary" style="display: inline-block;">블로그 전체 보기 <i class="ph ph-arrow-right"></i></a>
        </div>
      </div>
    </section>`;

  let html = fs.readFileSync(HOMEPAGE_PATH, 'utf8');

  if (!html.includes('<!-- LATEST_BLOG_START -->')) {
    console.warn('[build-blog] Homepage has no LATEST_BLOG markers, skipping injection.');
    return;
  }

  html = html.replace(
    /<!-- LATEST_BLOG_START -->[\s\S]*?<!-- LATEST_BLOG_END -->/,
    `<!-- LATEST_BLOG_START -->${sectionHtml}\n    <!-- LATEST_BLOG_END -->`
  );

  fs.writeFileSync(HOMEPAGE_PATH, html, 'utf8');
  console.log(`[build-blog] Injected ${latest.length} latest posts into homepage`);
}

function main() {
  console.log('[build-blog] Starting blog build…');
  const posts = collectPosts();
  renderPosts(posts);
  buildIndex(posts);
  updateSitemap(posts);
  updateHomepage(posts);
  console.log(`[build-blog] Done. ${posts.length} post(s) generated.`);
}

main();
