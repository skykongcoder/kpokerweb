# GitHub Actions 설정

## AI 블로그 포스트 자동 생성

`ai-blog-post.yml` 워크플로우가 매주 월/목 00:00 UTC(한국 시간 09:00)에 실행되어
`scripts/topics/queue.json`의 다음 주제로 블로그 글 초안을 생성하고 PR을 엽니다.

### 사전 설정 (1회만)

1. **Anthropic API 키 발급**
   - https://console.anthropic.com 에서 API 키 생성
   - `Pay-as-you-go` 결제 등록 필요 (글 1편당 약 $0.05~$0.20)

2. **GitHub Secret 등록**
   - 저장소 → `Settings` → `Secrets and variables` → `Actions`
   - `New repository secret` 클릭
   - Name: `ANTHROPIC_API_KEY`
   - Value: 발급받은 API 키 (sk-ant-... 로 시작)
   - `Add secret`

3. **Workflow 권한 확인**
   - 저장소 → `Settings` → `Actions` → `General`
   - Workflow permissions: **Read and write permissions** 선택
   - `Allow GitHub Actions to create and approve pull requests` 체크
   - `Save`

### 사용 방법

**자동 실행:** 매주 월/목 09:00 KST에 자동으로 PR이 생성됩니다.

**수동 실행:**
1. 저장소 → `Actions` 탭
2. 좌측 `AI Blog Post (semi-auto, PR for review)` 선택
3. 우측 `Run workflow` → `Run workflow` 클릭

### 글감 추가/관리

`scripts/topics/queue.json`을 직접 편집:

```json
{
  "topics": [
    {
      "title": "새 글 제목",
      "category": "strategy",
      "keywords": ["키워드1", "키워드2"],
      "angle": "글의 관점/내용 방향"
    }
  ]
}
```

큐가 비면 워크플로우는 아무것도 하지 않고 종료됩니다.

### PR 검토 체크리스트

자동 생성된 PR을 머지하기 전 반드시 확인:

- [ ] **사실 정확성** - 확률, 통계, 핸드 분석 수치
- [ ] **한국어 표현** - 어색한 번역체 없는지
- [ ] **홍보성 톤** - 과도한 광고 표현 없는지
- [ ] **마크다운 구조** - 제목/표/인용 정상 렌더링
- [ ] **카테고리/키워드** - 적절히 분류됐는지

수정이 필요하면 PR 브랜치에서 `blog/posts/<파일>.md`를 직접 편집한 뒤 머지.
