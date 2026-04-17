#!/usr/bin/env node
/**
 * AI Blog Post Generator
 *
 * Pulls the next topic from scripts/topics/queue.json, calls the Anthropic API
 * to generate a markdown post, writes it to /blog/posts/, and removes the topic
 * from the queue. Designed to run inside GitHub Actions on a cron schedule;
 * the resulting commit is pushed to a feature branch and a PR is opened for
 * human review (no auto-merge).
 *
 * Required env:
 *   ANTHROPIC_API_KEY   API key (stored as GitHub secret)
 *
 * Optional env:
 *   POST_DATE           ISO date (YYYY-MM-DD), default = today UTC
 *   ANTHROPIC_MODEL     default = claude-opus-4-7
 *   DRY_RUN             if set, prints the post but does not write files
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const QUEUE_PATH = path.join(__dirname, 'topics', 'queue.json');
const POSTS_DIR = path.join(ROOT, 'blog', 'posts');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
const POST_DATE = process.env.POST_DATE || new Date().toISOString().split('T')[0];
const DRY_RUN = !!process.env.DRY_RUN;

if (!API_KEY && !DRY_RUN) {
  console.error('[generate-post] ERROR: ANTHROPIC_API_KEY is not set.');
  process.exit(1);
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_PATH)) {
    throw new Error(`Queue file not found: ${QUEUE_PATH}`);
  }
  return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n', 'utf8');
}

function buildPrompt(topic) {
  return `당신은 K-POKER의 한국어 텍사스 홀덤 전문 콘텐츠 작가입니다. 아래 주제로 블로그 글을 작성하세요.

주제: ${topic.title}
카테고리: ${topic.category}
앵글: ${topic.angle}
타깃 키워드: ${topic.keywords.join(', ')}

요구사항:
1. 분량: 1,200~1,800자 (한글 기준), 6~10개 섹션
2. 형식: 순수 마크다운만 사용 (HTML 태그 금지). 제목은 ## 와 ### 만 사용
3. 톤: 정보성, 신뢰감, 학습 가치 중심. 도박/홍보성 표현 최소화
4. 구조: 도입 → 핵심 개념 → 실전 예시(표 또는 수치 포함) → 자주 하는 실수 → 정리
5. 표를 1개 이상 포함 (마크다운 |...| 형식)
6. 핵심 수치/통계를 가능한 정확하게 인용 (예: AA vs KK = 81.95% vs 17.59%)
7. 마지막에 "> 💡 **핵심 정리**" 형식의 인용 박스로 3~5개 요점 정리
8. 글 본문에서 "K-POKER", "kpoker.win" 같은 자기 사이트 언급 금지 (광고로 보이지 않게)

출력 형식 — 반드시 아래 YAML frontmatter로 시작:

---
title: "${topic.title}"
slug: "${topic.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}"
date: "${POST_DATE}"
category: "${topic.category}"
excerpt: "(150자 내외 요약 - SEO 디스크립션용)"
keywords: ${JSON.stringify(topic.keywords)}
---

(여기에 본문 시작)

frontmatter 외에는 어떤 설명도 추가하지 마세요. 마크다운 코드 블록(\`\`\`markdown)으로 감싸지 마세요.`;
}

async function callAnthropic(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error('Anthropic API returned no text content.');
  }
  return text;
}

function extractSlug(markdown) {
  const m = markdown.match(/^slug:\s*"([^"]+)"/m);
  return m ? m[1] : null;
}

async function main() {
  console.log(`[generate-post] Date: ${POST_DATE}, Model: ${MODEL}`);

  const queue = loadQueue();
  if (!queue.topics || queue.topics.length === 0) {
    console.log('[generate-post] Queue is empty. Nothing to generate.');
    process.exit(0);
  }

  const topic = queue.topics[0];
  console.log(`[generate-post] Generating: "${topic.title}"`);

  const prompt = buildPrompt(topic);

  if (DRY_RUN) {
    console.log('[generate-post] DRY_RUN mode — printing prompt instead of calling API:');
    console.log(prompt);
    process.exit(0);
  }

  const markdown = await callAnthropic(prompt);

  const slug = extractSlug(markdown);
  if (!slug) {
    throw new Error('Generated post is missing slug field in frontmatter.');
  }

  const filename = `${POST_DATE}-${slug}.md`;
  const outPath = path.join(POSTS_DIR, filename);

  if (fs.existsSync(outPath)) {
    console.error(`[generate-post] File already exists: ${outPath}`);
    process.exit(1);
  }

  fs.writeFileSync(outPath, markdown, 'utf8');
  console.log(`[generate-post] Wrote: ${outPath}`);

  // Remove the consumed topic from the queue
  queue.topics.shift();
  saveQueue(queue);
  console.log(`[generate-post] Queue size now: ${queue.topics.length}`);

  // Emit GitHub Actions outputs for downstream steps
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `title=${topic.title}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `filename=${filename}\n`);
  }
}

main().catch(err => {
  console.error('[generate-post] FAILED:', err);
  process.exit(1);
});
