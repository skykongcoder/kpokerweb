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

function buildPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.warn(`[build-blog] No posts directory at ${POSTS_DIR}, skipping.`);
    return [];
  }

  const postTemplate = fs.readFileSync(TEMPLATE_POST, 'utf8');
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
    const contentHtml = marked.parse(mdBody);
    const readingTime = calculateReadingTime(mdBody);

    const html = renderTemplate(postTemplate, {
      TITLE: escapeHtml(title),
      EXCERPT: escapeHtml(excerpt),
      KEYWORDS: escapeHtml(keywords),
      SLUG: slug,
      DATE_ISO: dateIso,
      DATE_DISPLAY: dateDisplay,
      CATEGORY: escapeHtml(categoryLabel),
      READING_TIME: readingTime,
      CONTENT: contentHtml,
    });

    const outPath = path.join(BLOG_OUT_DIR, `${slug}.html`);
    fs.writeFileSync(outPath, html, 'utf8');

    posts.push({
      slug,
      title,
      date,
      dateIso,
      dateDisplay,
      category,
      categoryLabel,
      excerpt,
      readingTime,
    });

    console.log(`[build-blog] Built: /blog/${slug}.html`);
  }

  posts.sort((a, b) => b.date - a.date);
  return posts;
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

function main() {
  console.log('[build-blog] Starting blog build…');
  const posts = buildPosts();
  buildIndex(posts);
  updateSitemap(posts);
  console.log(`[build-blog] Done. ${posts.length} post(s) generated.`);
}

main();
