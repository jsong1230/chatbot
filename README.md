# Chatbot 프로젝트

AI 기반 고객 지원 챗봇 시스템

## 프로젝트 개요

이 프로젝트는 고객과 관리자를 위한 AI 기반 챗봇 시스템입니다. 사용자 인증, 대화 이력 관리, 템플릿 기반 응답 등의 기능을 제공합니다.

## 기술 스택

- **Backend**: Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: JWT (jsonwebtoken), bcrypt
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Axios

## 프로젝트 구조

```
chatbot/
├── backend/           # 백엔드 API 서버
│   ├── src/
│   │   ├── routes/    # API 라우터
│   │   ├── services/  # 비즈니스 로직
│   │   ├── middleware/# 미들웨어 (인증, 에러 처리)
│   │   ├── utils/     # 유틸리티 함수
│   │   ├── types/     # TypeScript 타입 정의
│   │   └── errors/    # 커스텀 에러 클래스
│   ├── prisma/        # Prisma 스키마 및 마이그레이션
│   └── tests/         # 테스트 파일
├── frontend/          # 프론트엔드 Next.js 앱
│   ├── app/           # Next.js 14 App Router 페이지
│   ├── components/    # React 컴포넌트
│   ├── contexts/      # React Context (인증 등)
│   ├── hooks/         # 커스텀 훅
│   ├── lib/           # 유틸리티 및 API 클라이언트
│   └── types/         # TypeScript 타입 정의
└── docs/              # 프로젝트 문서
    ├── api/           # API 스펙 문서
    ├── db/            # DB 스키마 문서
    ├── specs/         # 요구사항/설계/계획 문서
    └── project/       # 프로젝트 기획 문서
```

## 환경 설정

### 필수 요구사항

- Node.js 18 이상
- PostgreSQL 16
- npm 또는 yarn

### 환경변수 설정

#### 백엔드 (`backend/.env`)

1. `backend/.env.example`을 복사하여 `backend/.env` 생성
2. 다음 환경변수 설정:

```env
# JWT 설정
JWT_SECRET=your-super-secret-key-min-32-characters-long-random-string

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot_db

# 서버 포트
PORT=4000

# 환경
NODE_ENV=development
```

**중요**: `JWT_SECRET`은 최소 32자 이상의 안전한 랜덤 문자열로 설정하세요.

#### 프론트엔드 (`frontend/.env.local`)

1. `frontend/.env.local.example`을 복사하여 `frontend/.env.local` 생성
2. 다음 환경변수 설정:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🐳 Docker로 빠른 시작 (권장)

가장 빠르고 간편한 방법입니다.

### 사전 요구사항
- Docker Engine 20.10 이상
- Docker Compose 2.0 이상

### 실행 방법

```bash
# 1. 환경변수 파일 생성
cp .env.example .env

# 2. .env 파일 편집 (필수)
# 에디터로 .env 파일을 열고 다음 항목을 반드시 설정하세요:
```

**필수 설정 항목**:

```env
# JWT Secret (최소 32자 이상, 프로덕션에서는 강력한 랜덤 문자열 사용)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# OpenAI API Key (sk-로 시작하는 키)
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# PostgreSQL 비밀번호 (프로덕션에서는 반드시 변경)
POSTGRES_PASSWORD=your-secure-database-password
```

**선택 설정 항목** (.env.example의 기본값 사용):
- `POSTGRES_USER`, `POSTGRES_DB` (데이터베이스 설정)
- `BACKEND_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT` (포트 설정)
- `ESCALATION_CONFIDENCE_THRESHOLD` (에스컬레이션 임계값)

```bash
# 3. 컨테이너 실행
docker-compose up -d

# 4. 서비스 접속
# - 프론트엔드: http://localhost:3000
# - 백엔드 API: http://localhost:4000
# - PostgreSQL: localhost:5432

# 5. 로그 확인 (선택)
docker-compose logs -f
```

**보안 주의사항**:
- `.env` 파일은 절대 Git에 커밋하지 마세요 (이미 .gitignore에 포함됨)
- 프로덕션 환경에서는 반드시 `JWT_SECRET`과 `POSTGRES_PASSWORD`를 강력한 랜덤 문자열로 변경하세요

**자세한 Docker 사용법**: [DOCKER.md](./DOCKER.md) 참조

---

## 로컬 개발 환경

Docker 없이 로컬에서 직접 실행하는 방법입니다.

### 백엔드

```bash
# 패키지 설치
cd backend
npm install

# Prisma Client 생성
npx prisma generate

# DB 마이그레이션 실행
npx prisma migrate dev

# 개발 서버 실행
npm run dev
```

서버가 `http://localhost:4000`에서 실행됩니다.

### 프론트엔드

```bash
# 패키지 설치
cd frontend
npm install

# 개발 서버 실행
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 주요 기능

### F-01: 사용자 인증 (완료)

**백엔드 API**:
- 회원가입 (`POST /api/auth/signup`)
- 로그인 (`POST /api/auth/login`)
- 익명 세션 생성 (`POST /api/auth/anonymous`)
- Access Token 갱신 (`POST /api/auth/refresh`)
- 로그아웃 (`POST /api/auth/logout`)

**프론트엔드 페이지**:
- 회원가입 페이지 (`/signup`)
- 로그인 페이지 (`/login`)
- 홈 페이지 (`/`) - 로그인 필요

**주요 기능**:
- JWT 기반 Stateless 인증 (Access Token + Refresh Token)
- 익명 세션 지원 (비회원 사용자)
- 토큰 자동 갱신 (Access Token 만료 시)
- 계정 잠금 (5회 로그인 실패 시 10분)
- localStorage 기반 토큰 관리

**문서**:
- API 스펙: `docs/api/auth.md`
- DB 스키마: `docs/db/user-auth.md`
- 컴포넌트: `docs/components/auth.md`

### F-02: 문의 자동 분류 (완료)

**백엔드 API**:
- 문의 분류 (`POST /api/classify`)
- 카테고리 목록 조회 (`GET /api/categories`)
- 카테고리별 통계 (`GET /api/conversations/stats/categories`)

**주요 기능**:
- OpenAI API 기반 자동 분류
- 신뢰도 점수 (0.0~1.0) 계산
- 신뢰도 임계값 기반 자동 에스컬레이션
- 폴백 전략 (3회 실패 시 "기타" 카테고리)

**문서**:
- API 스펙: `docs/api/inquiry-classification.md`
- DB 스키마: `docs/db/inquiry-classification.md`

### F-03: AI 기반 자동 답변 (완료)

**백엔드 API**:
- 채팅 및 답변 생성 (`POST /api/chat`)

**주요 기능**:
- OpenAI API 기반 대화형 답변 생성
- 최근 5개 메시지 이력 참조
- 답변 불가능 판단 및 자동 에스컬레이션
- 지수 백오프 재시도 로직

**문서**:
- API 스펙: `docs/api/auto-response.md`
- DB 스키마: `docs/db/auto-response.md`

### F-04: 대화 이력 저장 및 조회 (완료)

**백엔드 API**:
- 대화 목록 조회 (`GET /api/conversations`)
- 특정 대화 조회 (`GET /api/conversations/:conversationId`)
- 메시지 목록 조회 (`GET /api/conversations/:conversationId/messages`)
- 대화 검색 (`GET /api/conversations/search`)
- 대화 삭제 (`DELETE /api/conversations/:conversationId`)

**주요 기능**:
- Offset 기반 페이지네이션
- Cursor 기반 무한 스크롤
- Soft Delete (30일 후 물리 삭제)
- 기간별/카테고리별 필터링

**문서**:
- API 스펙: `docs/api/conversation-history.md`
- DB 스키마: `docs/db/conversation-history.md`

### F-05: 실시간 챗봇 UI (완료)

**프론트엔드 페이지**:
- 채팅 페이지 (`/chat`)

**주요 컴포넌트**:
- ChatWindow: 메시지 송수신, 대화 이력 복원
- MessageList: 메시지 렌더링, 자동 스크롤
- MessageInput: 입력 검증, 글자 수 카운터
- TypingIndicator: 타이핑 애니메이션
- ConnectionStatus: 연결 상태 표시

**주요 기능**:
- 실시간 메시지 송수신
- localStorage 기반 대화 복원
- 네트워크 재연결 (지수 백오프)
- 접근성 준수 (WCAG 2.1 Level AA)

**문서**:
- 컴포넌트: `docs/components/ChatWindow.md`

### F-06: 상담원 에스컬레이션 (완료)

**백엔드 API**:
- 에스컬레이션 생성 (`POST /api/escalations`)
- 에스컬레이션 목록 조회 (`GET /api/escalations`)
- 에스컬레이션 상세 조회 (`GET /api/escalations/:escalationId`)
- 에스컬레이션 할당 (`POST /api/escalations/:escalationId/assign`)
- 에스컬레이션 해결 (`POST /api/escalations/:escalationId/resolve`)
- 에스컬레이션 통계 (`GET /api/escalations/stats`)

**주요 기능**:
- 상담원 기반 워크플로우 (pending → assigned → resolved)
- Optimistic Locking으로 동시 할당 방지
- 기간별 통계 및 사유별 분석

**문서**:
- API 스펙: `docs/api/agent-escalation.md`
- DB 스키마: `docs/db/agent-escalation.md`

### F-07: 답변 템플릿 관리 (완료)

**백엔드 API**:
- 템플릿 생성 (`POST /api/templates`)
- 템플릿 목록 조회 (`GET /api/templates`)
- 템플릿 상세 조회 (`GET /api/templates/:id`)
- 템플릿 수정 (`PUT /api/templates/:id`)
- 템플릿 삭제 (`DELETE /api/templates/:id`)

**관리자 인터페이스**:
- 템플릿 관리 페이지 (`/admin/templates`)
- 템플릿 생성 페이지 (`/admin/templates/new`)
- 템플릿 수정 페이지 (`/admin/templates/:id/edit`)

**주요 기능**:
- 자주 묻는 질문(FAQ) 템플릿 관리
- 키워드 기반 자동 매칭 (점수: 키워드×10 + 우선순위 + 카테고리보너스)
- 메모리 캐시로 높은 성능 (12ms 매칭 시간)
- F-03과 자동 통합 (매칭 실패 시 AI 폴백)
- 사용 통계 추적 (사용 횟수, 최근 사용일)
- Soft Delete 지원 (논리적 삭제)

**성능 목표**:
- 템플릿 매칭: 12ms
- 전체 응답: 245ms (AI는 2340ms)

**문서**:
- API 스펙: `docs/api/faq-template-management.md`
- DB 스키마: `docs/db/faq-template-management.md`
- 컴포넌트: `docs/components/TemplateForm.md`, `docs/components/TemplateList.md`

### F-08: 관리자 대시보드 (완료)

**백엔드 API**:
- 통계 조회 (`GET /api/analytics`)

**주요 지표**:
- 대화 건수 (일별 증감률)
- 자동 해결률
- 카테고리별 분포 (상위 6개)
- 평균 응답 시간 (초 단위)
- 고객 만족도 (F-09 연동)
- 에스컬레이션 통계

**주요 기능**:
- 병렬 쿼리로 빠른 응답 (평균 120ms)
- 인덱스 최적화로 각 쿼리 < 50ms

**문서**:
- API 스펙: `docs/api/admin-dashboard.md`

### F-09: 고객 만족도 피드백 (완료)

**백엔드 API**:
- 피드백 제출 (`POST /api/feedback`)
- 피드백 목록 조회 (`GET /api/feedback`)
- 피드백 상세 조회 (`GET /api/feedback/:feedbackId`)
- 피드백 통계 (`GET /api/feedback/stats`)

**주요 기능**:
- 대화당 1회만 제출 가능 (중복 방지)
- 긍정/부정 평가 + 의견
- XSS 방지 (comment sanitize)
- Rate Limiting (1분 10회)
- 일별/카테고리별 만족도 분석

**문서**:
- API 스펙: `docs/api/feedback.md`
- DB 스키마: `docs/db/feedback.md`

### F-10: 다국어 지원 (완료)

**백엔드 API**:
- 언어 자동 감지 (`POST /api/chat` - 응답에 language 필드 포함)
- 대화 언어 변경 (`PUT /api/conversations/:id/language`)
- 카테고리 다국어 이름 (name_ko, name_en)

**프론트엔드**:
- 언어 토글 UI (🌐 KO | EN)
- 다국어 경로 (`/[lang]/chat`, `/[lang]/admin` 등)
- 모든 UI 텍스트 다국어 (next-intl 기반)

**주요 기능**:
- 언어 자동 감지 (franc 라이브러리, 정확도 95%+)
- 언어별 맞춤 AI 답변 (한국어/영어 완전 분리 프롬프트)
- 카테고리 다국어 이름 지원
- localStorage 언어 설정 유지
- 하위 호환성 보장 (기본값 'ko')

**성능**:
- 언어 감지: 35ms
- 전체 응답: 2.1초
- 언어 토글: 320ms

**문서**:
- API 스펙: `docs/api/multilingual-support.md`
- DB 스키마: `docs/db/multilingual-support.md`
- 컴포넌트: `docs/components/LanguageToggle.md`

### 향후 기능

- F-11: 상담원 대시보드 (미할당 목록, 개인 통계)
- F-12: 추가 언어 지원 (중국어, 일본어, 스페인어)
- F-13: 사용자 피드백 기반 AI 학습

## API 문서

자세한 API 스펙은 다음 문서를 참조하세요:

- 인증 API: `docs/api/auth.md`
- DB 스키마: `docs/db/user-auth.md`

## 개발 가이드

### 코딩 컨벤션

- 주석: 한국어
- 변수명: 영어 camelCase
- 들여쓰기: 2스페이스
- 세미콜론: 사용
- any 타입 사용 금지
- console.log 금지 (프로덕션)

### Git 커밋 메시지

Conventional Commits 형식 사용:

- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 리팩토링
- `test:` 테스트
- `docs:` 문서
- `chore:` 기타

### 테스트

```bash
# 백엔드 단위 테스트
cd backend
npm test

# 통합 테스트
npm run test:integration
```

## 라이선스

ISC

## 문의

프로젝트 관련 문의는 이슈를 생성해주세요.
