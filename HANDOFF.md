# K-POKER 프로젝트 인수인계 문서

> 계정 변경 시 이 파일을 새 계정의 Claude Code에 보여주면 즉시 작업을 이어갈 수 있습니다.

---

## 1. 프로젝트 개요

- **사이트:** https://kpoker.win
- **저장소:** https://github.com/skykongcoder/kpokerweb
- **호스팅:** Cloudflare Pages (GitHub `main` 브랜치 자동 배포)
- **로컬 경로:** `D:\antigravity\kpoker`
- **기술 스택:** Vite (멀티페이지) + 정적 HTML + Vanilla JS + Cloudflare Workers Static Assets

---

## 2. 디렉토리 구조

```
kpoker/
├── index.html                  # 홈페이지
├── strategy.html               # 전략 페이지
├── guide.html                  # 사용자 가이드
├── notice.html                 # 공지사항
├── insta.html                  # 인스타 랜딩
├── style.css                   # 전역 스타일
├── vite.config.js              # 멀티페이지 빌드 설정
├── wrangler.jsonc              # Cloudflare 배포 설정
├── .gitattributes              # XML/_redirects LF 강제 (중요)
├── public/
│   ├── sitemap.xml             # 자동 생성 (build-blog.js가 매 빌드시 재작성)
│   ├── robots.txt
│   ├── _redirects              # .html → 클린 URL 301 + 옛 한글 slug 리다이렉트
│   └── *.png, *.webp, favicon.svg
├── blog/
│   ├── template-post.html      # 개별 글 템플릿 (SEO + 브레드크럼 + 관련글)
│   ├── template-index.html     # 블로그 목록 페이지 템플릿
│   ├── posts/                  # 마크다운 원본 (frontmatter + body)
│   │   ├── 2026-04-15-aa-vs-kk-preflop-dynamics.md
│   │   ├── 2026-04-17-ak-vs-jj-coinflip-myth.md
│   │   ├── 2026-04-17-pot-odds-basics.md
│   │   └── 2026-04-18-position-power-button.md
│   └── *.html                  # build-blog.js가 자동 생성 (커밋 대상)
└── scripts/
    ├── build-blog.js           # MD → HTML 빌더 (벼이트 빌드 전 자동 실행)
    └── topics/
        └── queue.json          # 자동 포스팅 글감 큐
```

---

## 3. 빌드 / 배포 흐름

```
npm run build
  └─ scripts/build-blog.js
       1. blog/posts/*.md 읽고 → blog/<slug>.html 생성
       2. blog/index.html 생성 (글 목록)
       3. public/sitemap.xml 전체 재작성 (LF, 미니멀 포맷)
       4. index.html의 <!-- LATEST_BLOG_START/END --> 마커 사이에 최신 3개 티저 주입
  └─ vite build → dist/

git push origin main → Cloudflare Pages 자동 배포 (~1-2분)
```

**중요:** sitemap.xml은 build-blog.js가 매번 재작성합니다. 직접 편집 금지 (또는 편집 후 build를 한 번 더 돌리지 않도록 주의).

---

## 4. 자동 블로그 포스팅 루틴

**Routine ID:** `kpoker-blog-post`
**스케줄:** `3 9 * * 1,4` (월/목 09:03, 로컬 시간)
**위치:** `C:\Users\ainst\.claude\scheduled-tasks\kpoker-blog-post\SKILL.md`

### 동작
1. `git checkout main && git pull`
2. `scripts/topics/queue.json`의 `topics[0]` 사용
3. AI 검출 우회용 글쓰기 원칙 적용 (5개 구조 패턴 중 1개, 1인칭 1-2회, 정밀 수치, GTO 솔버 인용 등)
4. `blog/posts/{date}-{slug}.md` 작성 (slug는 ASCII만)
5. queue에서 사용한 topic 제거
6. `npm run build` → 자동 커밋/푸시 (사용자 컨펌 없음)

### 현재 큐 (4개)
1. C-Bet(컨티뉴에이션 베트)
2. 스타팅 핸드 차트 - 169개 핸드
3. 블러프의 경제학
4. 토너먼트 ICM 입문

### 새 계정 이전 시 주의
- `C:\Users\ainst\.claude\scheduled-tasks\kpoker-blog-post\` 폴더를 새 계정 `.claude` 디렉토리로 복사
- 또는 새 계정에서 동일한 SKILL.md 내용으로 routine 재생성 필요 (위 SKILL.md 내용 활용)

---

## 5. 사용자 메모리 (선호도)

`C:\Users\ainst\.claude\projects\D--antigravity-kpoker\memory\feedback_token_efficiency.md`

요약: **토큰 사용 최소화** — 재독 금지, 병렬 호출, 응답 짧게, subagent 응답 길이 제한.

새 계정으로 이전 시 동일 내용 메모리 등록 권장.

---

## 6. SEO / 검색엔진 상태

- **사이트맵:** 10개 URL (홈, strategy, guide, notice, insta, blog, 4개 블로그 글)
- **포맷:** 미니멀 (image 확장자 없음, 주석 없음, LF)
- **GSC 상태:** "Sitemap could not be read" 메시지가 캐시로 남아있지만 Last read는 매일 갱신 중. UI 잔류 버그.
- **인덱싱 상태:** Validation "Started" (Google이 우리 수정 후 재크롤링 중)
- **Schema.org:** BlogPosting + BreadcrumbList + Blog + Organization JSON-LD 적용
- **Open Graph + Twitter Card:** 전체 페이지 적용

### 인덱싱 가속 액션 (사용자가 GSC에서 수동)
1. **URL Inspection** → 각 페이지 "Request Indexing" (하루 10개 한도)
2. 백링크 확보 (인스타, 네이버 블로그, 카페 등)
3. **Sitemaps** 메뉴 → Remove → 24시간 후 재추가

---

## 7. 헤더 디자인 표준

모든 페이지 (index, strategy, guide, notice, blog 템플릿) 동일:
```html
<div class="header-actions">
  <span class="bonus-badge"><i class="ph-fill ph-gift"></i> 50% 보너스 지급중</span>
  <span class="code-badge"><i class="ph-fill ph-key"></i> 가입코드 <strong>1122</strong></span>
  <a href="https://kpoker.gg/ko" ... class="btn-primary wave-btn">가입하고 시작하기</a>
</div>
```

CTA 텍스트 = **"가입하고 시작하기"** (페이지마다 다르게 하지 말 것)

---

## 8. 성능 최적화

- **Phosphor 아이콘:** `<link rel="stylesheet">`로 직접 로드 (regular + fill 두 weight). 이전 JS loader는 깜빡임 유발해서 제거.
- **Speculation Rules:** 모든 페이지 head에 hover prerender 적용 (Chrome/Edge 즉시 전환).
- **View Transitions:** 깜빡임 때문에 제거.

---

## 9. 알려진 이슈 / 주의사항

| 항목 | 메모 |
|------|------|
| 한글 slug | Cloudflare URL 인코딩 이슈로 404. 반드시 ASCII만. |
| sitemap.xml 직접 편집 | build-blog.js가 덮어씀. 정적 entries 변경하려면 build-blog.js의 `staticEntries` 배열 수정 |
| `.gitattributes` | XML/`_redirects`의 CRLF 변환 방지 (중요 — 지우지 말 것) |
| `wrangler.jsonc` | `not_found_handling` 옵션 추가 시 404.html 없으면 redirect loop 발생 |
| `_redirects` | `/blog/<slug> 200 rewrite` 같은 규칙 추가 금지 (Cloudflare html_handling과 충돌) |

---

## 10. 최근 작업 이력 (최신 → 과거)

| 커밋 | 내용 |
|------|------|
| 851b51d | sitemap LF 정규화 재배포 트리거 |
| fc3a941 | .gitattributes로 LF 강제 |
| 51906f5 | sitemap 미니멀 포맷 재작성 (image ns/주석 제거) |
| 7967e71 | 옛 한글 slug → 새 ASCII slug 301 리다이렉트 |
| df157f2 | sitemap lastmod 오늘 날짜로 갱신 |
| 81e5562 | 블로그 인덱스 상단 여백 축소 |
| 9f504b4 | 블로그 인덱스 히어로 섹션 제거 |
| b0ae0b4 | 블로그 히어로 홍보문구 추가 (이후 제거됨) |
| 66eaf3a | Phosphor 아이콘 깜빡임 수정 (CSS 직접 로드) |
| 3ea0944 | view-transition 페이드 제거 |
| adfa709 | Speculation Rules + View Transitions 도입 |
| 5dca49a | 가입코드 1122 배지 모든 페이지 |
| 0226462 | 50% 보너스 배지 모든 페이지 |
| f29025b | 헤더 CTA "가입하고 시작하기" 통일 |
| 31e5389 | 블로그 카드 배경 이미지 |
| 0d0c10c | SEO 강화 (브레드크럼, 관련글, 홈 티저) |

---

## 11. 새 계정에서 작업 재개 방법

1. **저장소 클론** (이미 로컬에 있으면 skip):
   ```
   git clone https://github.com/skykongcoder/kpokerweb.git D:\antigravity\kpoker
   cd D:\antigravity\kpoker
   npm install
   ```

2. **이 HANDOFF.md를 새 Claude Code 세션 첫 메시지에 붙여넣거나 Read 도구로 읽히기**

3. **루틴 복구** (블로그 자동 포스팅 유지하려면):
   - 위 4번 섹션의 SKILL.md 내용으로 새 routine 등록
   - cron: `3 9 * * 1,4`

4. **메모리 등록** (선호도 유지하려면):
   - 5번 섹션의 토큰 최적화 메모리 등록

5. **GitHub 인증** 확인 (push 가능해야 함)

---

## 12. 자주 쓰는 명령

```bash
# 빌드
npm run build

# 로컬 미리보기
npm run preview

# 사이트맵 확인
curl -s https://kpoker.win/sitemap.xml | head -20

# 새 글 작성 (수동) — blog/posts/{YYYY-MM-DD}-{ascii-slug}.md 생성 후
npm run build && git add -A && git commit -m "post: 제목" && git push origin main
```
