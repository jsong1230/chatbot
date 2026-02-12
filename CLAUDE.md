# 프로젝트: AI 챗봇 (고객 문의 자동 분류 및 답변)

## 프로젝트 개요

고객 문의를 자동으로 분류하고 답변하는 AI 챗봇입니다. OpenAI API를 활용하여 고객의 질문을 이해하고, 적절한 카테고리로 분류하며, 맥락에 맞는 답변을 제공합니다. 웹 기반 인터페이스를 통해 실시간 대화를 지원하며, 관리자 대시보드에서 문의 이력과 통계를 확인할 수 있습니다.

---

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16
- **AI**: OpenAI API (GPT-4/GPT-3.5)
- **테스트**: Vitest (backend), Playwright (E2E)
- **배포**: Docker
- **기타**: Redis (세션/캐시), WebSocket (실시간 채팅)

---

## 디렉토리 구조

```
chatbot/
├── frontend/                     # 프론트엔드
│   ├── src/app/                  # Next.js App Router 페이지
│   ├── src/components/           # React 컴포넌트 (ChatWindow, MessageList 등)
│   └── src/lib/                  # API 클라이언트, 유틸리티
├── backend/                      # 백엔드
│   ├── src/routes/               # Express API 라우트
│   ├── src/services/             # 비즈니스 로직 (ChatService, ClassificationService)
│   └── src/models/               # Prisma 모델 및 타입
├── docs/
│   ├── project/                  # 프로젝트 레벨 기획 (init-project 시 생성)
│   │   ├── prd.md                   # 프로젝트 요구사항 정의서 (project-planner)
│   │   ├── features.md              # 기능 백로그 + 상태 추적 (project-planner)
│   │   └── roadmap.md               # 마일스톤 로드맵 (project-planner)
│   ├── specs/                    # 분석/설계/계획 (구현 전, product-manager + architect)
│   │   └── {기능명}/
│   │       ├── requirements.md      # 요구사항 분석서 (product-manager)
│   │       ├── design.md            # 기술 설계서 (architect)
│   │       └── plan.md              # 구현 계획서 (product-manager)
│   ├── api/                      # API 스펙 확정본 (구현 후, backend-dev)
│   ├── db/                       # DB 스키마 설계서 확정본 (구현 후, backend-dev)
│   ├── components/               # 컴포넌트 문서 (구현 후, frontend-dev, 선택)
│   └── dev-log.md                # 진행 로그 (doc-writer)
├── CHANGELOG.md                  # 변경 로그 (doc-writer)
├── .claude/                      # Claude Code 설정
│   ├── agents/                   # 커스텀 에이전트
│   ├── commands/                 # 커스텀 명령어
│   └── scripts/                  # 자동화 스크립트
└── .worktrees/                   # Agent Team 워크트리 (gitignore됨)
```

---

## 코딩 컨벤션

### 일반
- 주석 언어: 한국어
- 변수명 언어: 영어
- 들여쓰기: 2스페이스
- 세미콜론: 사용

### 프론트엔드
- 함수형 컴포넌트 + React Server Components 우선
- Tailwind CSS로 스타일링 (인라인 style 금지)
- API 호출은 lib/api-client.ts를 통해서만
- 클라이언트 컴포넌트는 'use client' 지시어 명시

### 백엔드
- API 응답 형식: `{ success: boolean, data?: T, error?: string }`
- 서비스 레이어에 비즈니스 로직 분리 (컨트롤러는 얇게)
- 에러 핸들링은 커스텀 AppError 클래스 사용
- Prisma로 DB 접근 (직접 SQL 쿼리 지양)

### 공통 금지 사항
- any 타입 사용 금지 (불가피한 경우 unknown 사용 후 타입 가드)
- console.log 대신 프로젝트 로거 사용 (winston/pino)
- 하드코딩된 설정값 → 환경변수로
- API 키는 절대 클라이언트 코드에 노출 금지

---

## Git 규칙

### 커밋 메시지
- 형식: Conventional Commits
  - `feat:` 새 기능 / `fix:` 버그 수정 / `refactor:` 리팩토링
  - `test:` 테스트 / `docs:` 문서 / `chore:` 기타
- 본문 언어: 한국어
- 예시: `feat: 챗봇 메시지 분류 기능 추가`
- 하나의 논리적 단위 = 하나의 커밋
- 커밋 분리 기준: 설계 문서 / 구현 코드 / 기술 문서 / 운영 문서 / 테스트

### 브랜치 전략
- 작업 브랜치: `feature/기능명`, `fix/이슈명`
- 병렬 작업 시: `feature/기능명-backend`, `feature/기능명-frontend`
- 커밋 전 반드시 테스트 통과 확인

### Git Worktree 규칙 (Agent Team 병렬 작업 시)
- 병렬 작업 시 `.worktrees/` 하위에 팀원별 worktree를 생성
- 각 팀원은 자신의 worktree에서만 작업 (다른 worktree 수정 금지)
- worktree 구조:
  - `.worktrees/기능명-backend/` → `feature/기능명-backend` 브랜치
  - `.worktrees/기능명-frontend/` → `feature/기능명-frontend` 브랜치
- 작업 완료 후 main 브랜치로 merge → worktree 삭제
- `.worktrees/` 디렉토리는 .gitignore에 포함됨

---

## 문서화 규칙

> 문서는 작성 시점과 성격에 따라 네 가지로 분류됩니다.
> 각 문서의 담당 에이전트가 정해져 있습니다.

### 프로젝트 기획 문서 — 프로젝트 시작 시 작성

> "무엇을 만들 것인가"를 프로젝트 전체 레벨에서 정의합니다.
> `/init-project` 명령어로 생성되며, `docs/project/features.md`가 기능 개발의 Source of Truth입니다.

| 문서 | 담당 에이전트 | 위치 | 내용 |
|------|-------------|------|------|
| PRD | project-planner | `docs/project/prd.md` | 프로젝트 목적, 대상, 핵심 기능, 비기능 요구사항 |
| 기능 백로그 | project-planner | `docs/project/features.md` | 기능 목록, 우선순위, 의존성, 상태 추적 |
| 마일스톤 로드맵 | project-planner | `docs/project/roadmap.md` | 마일스톤별 목표, 포함 기능, 산출물 |

- `/auto-dev` 명령어가 features.md를 읽어 기능을 자동 연속 개발 (문제 시에만 멈춤)
- `/next-feature` 명령어가 features.md를 읽어 다음 기능 1개를 선택

### 사전 문서 (분석/설계/계획) — 구현 전에 작성

> "왜, 무엇을, 어떻게 만들 것인가"를 기록합니다.
> 의사결정 근거를 보존하여 나중에 "왜 이렇게 만들었지?"를 추적할 수 있게 합니다.

| 문서 | 담당 에이전트 | 위치 | 내용 |
|------|-------------|------|------|
| 요구사항 분석서 | product-manager | `docs/specs/{기능명}/requirements.md` | 유저 스토리, 기능/비기능 요구사항, 제약조건 |
| 기술 설계서 | architect | `docs/specs/{기능명}/design.md` | 아키텍처 결정, API/DB 설계, 시퀀스 흐름 |
| 구현 계획서 | product-manager | `docs/specs/{기능명}/plan.md` | 태스크 분해, 의존성, 병렬 실행 판단 |

- 구현 중 설계가 변경되면 design.md에 "변경 이력" 섹션으로 기록
- 요건 변경/추가 발생 시: product-manager가 requirements.md 업데이트 → architect가 design.md 영향 분석 및 업데이트 → product-manager가 plan.md 업데이트

### 사후 문서 (기술 문서) — 구현 직후 작성

> "실제로 어떻게 되어있는지"를 기록합니다.
> 코드와 100% 일치해야 하므로 구현한 에이전트가 직접 작성합니다.

| 문서 | 담당 에이전트 | 위치 | 시점 |
|------|-------------|------|------|
| API 스펙 확정본 | backend-dev | `docs/api/{기능명}.md` | API 구현 직후 |
| DB 스키마 확정본 | backend-dev | `docs/db/{기능명}.md` | 스키마 변경 시 |
| 컴포넌트 문서 | frontend-dev | `docs/components/{컴포넌트}.md` | 주요 컴포넌트 구현 시 (선택) |

- 설계서(design.md)와 다르게 구현된 부분은 "설계 대비 변경사항"으로 기록

### 운영 문서 — 전체 완료 후 작성

> "무엇을 했는지"를 기록합니다.

| 문서 | 담당 에이전트 | 위치 | 시점 |
|------|-------------|------|------|
| 개발 진행 로그 | doc-writer | `docs/dev-log.md` | 기능 완료 후 |
| CHANGELOG | doc-writer | `CHANGELOG.md` | 기능 완료 후 |
| README 업데이트 | doc-writer | `README.md` | 필요 시 |

### 원칙
- 사전 문서(specs/)는 의사결정 근거를 보존 → 6개월 후에도 "왜"를 추적 가능
- 사후 문서(api/, db/)는 코드와 일치 → 다른 개발자가 "어떻게"를 즉시 파악
- code-reviewer가 설계↔구현 일치, 기술 문서↔코드 일치를 검증
- doc-writer는 기술/설계 문서가 누락된 것을 발견해도 직접 작성하지 않고 보고만 함

---

## 실행 방법

| 용도 | 명령어 |
|------|--------|
| Backend 개발 서버 | `cd backend && npm run dev` (포트 4000) |
| Frontend 개발 서버 | `cd frontend && npm run dev` (포트 3000) |
| DB 마이그레이션 | `cd backend && npx prisma migrate dev` |
| Backend 테스트 | `cd backend && npm test` |
| Frontend 테스트 | `cd frontend && npx playwright test` |
| 전체 빌드 | `npm run build` |
| 린트 | `npm run lint` |

---

## 환경변수

| 변수명 | 용도 | 위치 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `.env` |
| `OPENAI_API_KEY` | OpenAI API 인증 키 | `.env` |
| `JWT_SECRET` | JWT 토큰 서명 키 | `.env` |
| `REDIS_URL` | Redis 연결 문자열 (세션/캐시) | `.env` |
| `PORT` | 백엔드 서버 포트 (기본값: 4000) | `.env` |

> Worktree 사용 시: .env가 gitignore되어 있으면 각 worktree에 별도로 복사해야 합니다.

---

## MCP 서버 설정

| MCP 서버 | 용도 | 사용 에이전트 |
|----------|------|--------------|
| `postgres` | PostgreSQL DB 스키마 조회 + 읽기 전용 쿼리 | architect, backend-dev, code-reviewer |
| `chrome-devtools` | 브라우저 DevTools 접근 (콘솔, 네트워크, DOM 검사) | frontend-dev, test-runner, code-reviewer |

> MCP 서버는 .claude/settings.json에 정의되어 있습니다.
> DATABASE_URL 환경변수가 .env에 설정되어 있어야 postgres MCP 서버가 작동합니다.

---

## 에이전트 라우팅 규칙

### 프로젝트 기획

| 단계 | 에이전트 | 작성하는 문서 |
|------|----------|-------------|
| 프로젝트 기획 | `project-planner` | `docs/project/prd.md`, `features.md`, `roadmap.md` |

### 서브에이전트 (순차 작업)

| 단계 | 에이전트 | 작성하는 문서 |
|------|----------|-------------|
| 요구사항 분석 | `product-manager` | `docs/specs/{기능}/requirements.md` |
| 기술 설계 | `architect` | `docs/specs/{기능}/design.md` |
| 구현 계획 | `product-manager` | `docs/specs/{기능}/plan.md` |
| `backend/` 구현 | `backend-dev` | `docs/api/`, `docs/db/` |
| `frontend/` 구현 | `frontend-dev` | `docs/components/` (선택) |
| 테스트 | `test-runner` | — |
| 코드 + 문서 리뷰 | `code-reviewer` | — (검증만) |
| 진행 로그 / CHANGELOG | `doc-writer` | `docs/dev-log.md`, `CHANGELOG.md` |

### Agent Team (병렬 작업)
- 분석/설계/계획은 항상 순차 실행 (구현 전에 완료)
- 구현 단계에서 독립 작업이 2개 이상이면 Agent Team + worktree 사용
- 팀원 생성 시 반드시 커스텀 에이전트(subagent_type)를 지정할 것
- 각 팀원은 자신의 worktree에서 작업, 설계서(design.md)를 참조하여 구현
- 팀 리더는 delegate mode로 조율에만 집중

### 경량 작업
- 버그 수정 / 단순 작업 → `/quick-fix` (분석·설계 없이 수정 → 테스트 → 커밋)

### 마무리 작업
- 기능 완료 후 → `/wrap-up` 명령어로 운영 문서 + 커밋 일괄 처리
- 빠른 커밋만 필요하면 → `/commit` 명령어

---

## 파이프라인 실행 가이드

### 프로젝트 초기 기획 (1회)
```
/init-project
```
흐름: PRD → 기능 분해 → 마일스톤 로드맵 → 사용자 리뷰 & 확정

### 자동 연속 개발 (권장)
```
/auto-dev
```
흐름: features.md 읽기 → 다음 기능 자동 선택 → 파이프라인 실행 → 완료 → 다음 기능 자동 시작
멈추는 조건: 마일스톤 경계 / Critical 이슈 / 테스트 실패(2회) / 사용자 판단 필요 / 전체 완료

### 수동 기능 선택 & 개발 (1건씩)
```
/next-feature
```
흐름: features.md 읽기 → 다음 기능 추천 → 사용자 확인 → 개발 파이프라인 실행 → 완료 처리

### 순차 파이프라인 (서브에이전트)
```
/fullstack-feature 기능 설명
```
흐름: 분석 → 설계 → 계획 → 백엔드(+API스펙+DB설계서) → 프론트(+컴포넌트문서) → 테스트 → 리뷰 → 운영문서 → 커밋

### 병렬 파이프라인 (Agent Team + worktree)
```
/fullstack-feature-team 기능 설명
```
흐름: 분석 → 설계 → 계획 → worktree 생성 → 병렬 구현(설계서 기반, +기술문서) → merge → 테스트 → 리뷰 → 운영문서 → 커밋

### 버그 수정 / 단순 작업
```
/quick-fix 수정 내용
```
흐름: 현황 파악 → 수정 → 테스트 → 리뷰(선택) → 커밋

### 마무리
```
/wrap-up 기능명    # 문서 상태 점검 + 운영 문서 + 커밋
/commit            # 커밋만
```

---

## 프로젝트 특이사항

### OpenAI API 사용
- API 호출 시 반드시 재시도 로직 포함 (지수 백오프, 최대 3회)
- Rate limit 에러 처리 필수
- 프롬프트는 환경변수 또는 설정 파일로 관리 (코드에 하드코딩 금지)
- API 응답은 로깅하되, 사용자 입력은 PII 마스킹 후 로깅

### 보안
- 사용자 입력은 반드시 검증 및 sanitize (XSS, SQL Injection 방지)
- API 키는 환경변수로만 관리, 클라이언트 코드 노출 절대 금지
- 비밀번호는 bcrypt로 해싱 (최소 10 rounds)
- CORS 설정: 프로덕션에서는 허용 도메인만 화이트리스트

### 성능
- 채팅 메시지는 페이지네이션 (무한 스크롤 또는 페이징)
- AI 응답 대기 중 로딩 표시 필수
- 장시간 대기 시 타임아웃 처리 (30초)

### 데이터 관리
- 채팅 이력은 soft delete (삭제 플래그) 사용
- 개인정보 보유 기간 준수 (정책에 따라 자동 삭제)

---

## 참고 자료

- OpenAI API 문서: https://platform.openai.com/docs/api-reference
- Next.js 14 문서: https://nextjs.org/docs
- Prisma 문서: https://www.prisma.io/docs
- 프로젝트 기획 문서: `docs/project/prd.md` (/init-project 실행 후 생성됨)
