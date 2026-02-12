# 기능 백로그

> PRD: docs/project/prd.md

---

## 기능 목록

| ID | 기능명 | 설명 | 우선순위 | 의존성 | 병렬 그룹 | 충돌 영역 | 마일스톤 | 상태 |
|----|--------|------|----------|--------|-----------|-----------|----------|------|
| F-01 | 사용자 인증 | JWT 기반 회원가입/로그인 (선택적) | Must | - | - | user, auth | M1 | ✅ 완료 |
| F-02 | 문의 자동 분류 | OpenAI API로 문의를 카테고리로 분류 | Must | F-01 | PG-1 | conversation, category, openai_service | M1 | ✅ 완료 |
| F-03 | AI 기반 자동 답변 | 분류된 문의에 대한 맥락 기반 답변 생성 | Must | F-01 | PG-1 | conversation, message, openai_service | M1 | ✅ 완료 |
| F-04 | 대화 이력 저장 및 조회 | 모든 대화를 DB에 저장하고 검색 | Must | F-01 | PG-1 | conversation, message | M1 | ✅ 완료 |
| F-05 | 실시간 챗봇 UI | WebSocket 기반 실시간 채팅 인터페이스 | Must | F-02, F-03 | - | ChatWindow 컴포넌트, WebSocket | M2 | ✅ 완료 |
| F-06 | 상담원 에스컬레이션 | 처리 불가능한 문의를 상담원에게 전달 | Must | F-02, F-04 | - | escalation, conversation | M2 | ✅ 완료 |
| F-07 | 답변 템플릿 관리 | FAQ 답변을 관리자가 직접 관리 (CRUD) | Should | F-01 | - | faq_template | M3 | ✅ 완료 |
| F-08 | 관리자 대시보드 | 통계, 분류 현황, 에스컬레이션 비율 시각화 | Should | F-04, F-06 | PG-2 | Dashboard 컴포넌트, analytics_service | M3 | ✅ 완료 |
| F-09 | 고객 만족도 피드백 | 대화 종료 후 만족도 평가 (좋음/나쁨) | Should | F-04 | PG-2 | feedback, conversation | M3 | ✅ 완료 |
| F-10 | 다국어 지원 | 한국어/영어 자동 감지 및 답변 | Could | F-02, F-03 | - | openai_service, i18n | M4 | ✅ 완료 |

---

## 병렬 그룹 규칙
- **같은 마일스톤** 내에서만 그룹 구성
- 그룹 내 기능 간 **상호 의존성 없음**
- 그룹 내 기능 간 **충돌 영역 미겹침**
- 그룹당 **최대 3개** 기능
- `-`이면 단독 실행 (의존성 체인의 시작점이거나 충돌 위험)

### PG-1: M1 병렬 그룹 1 (백엔드 핵심 기능)
- F-02 (문의 자동 분류)
- F-03 (AI 기반 자동 답변)
- F-04 (대화 이력 저장 및 조회)

**병렬 가능 근거**:
- 모두 F-01 (사용자 인증) 완료 후 시작 가능
- 서로 다른 서비스 레이어 작업 (ClassificationService, ChatService, ConversationService)
- openai_service는 공통 모듈이지만 인터페이스 정의 후 독립 구현 가능

### PG-2: M3 병렬 그룹 2 (부가 기능)
- F-08 (관리자 대시보드)
- F-09 (고객 만족도 피드백)

**병렬 가능 근거**:
- 의존하는 기능(F-04, F-06)이 M2에서 완료
- F-08은 주로 프론트엔드 + 읽기 API, F-09는 DB 테이블 추가 + 쓰기 API
- 충돌 영역 없음 (다른 컴포넌트, 다른 테이블)

---

## 상태 범례
- ⏳ 대기: 아직 시작하지 않음
- 🔄 진행중: 현재 개발 중
- ✅ 완료: 개발 + 테스트 + 리뷰 완료
- ⏸️ 보류: 일시 중단
- ❌ 취소: 구현하지 않기로 결정

---

## 의존성 다이어그램

```
F-01 (사용자 인증)
  ├──▶ F-02 (문의 분류) ──┐
  ├──▶ F-03 (자동 답변) ──┼──▶ F-05 (실시간 UI) ──┐
  ├──▶ F-04 (대화 이력) ──┘                       ├──▶ F-08 (대시보드)
  └──▶ F-07 (템플릿 관리)                          │
                                                   │
F-02, F-04 ──▶ F-06 (에스컬레이션) ────────────────┤
                                                   │
F-04 ──▶ F-09 (만족도 피드백) ──────────────────────┘

F-02, F-03 ──▶ F-10 (다국어 지원)
```

---

## 기능별 상세 설명

### F-01: 사용자 인증
**목적**: 고객과 관리자를 구분하고, 대화 이력을 사용자별로 관리

**핵심 요구사항**:
- 이메일 기반 회원가입/로그인
- JWT 토큰 발급 (Access Token + Refresh Token)
- 비회원도 채팅 가능 (익명 세션)
- 역할 구분: `customer` (일반 고객), `admin` (관리자), `agent` (상담원)

**충돌 영역**:
- DB 테이블: `user`, `session`
- 백엔드 모듈: `auth.routes.ts`, `auth.service.ts`
- 프론트엔드: 로그인 페이지 (`app/login/page.tsx`)

---

### F-02: 문의 자동 분류
**목적**: 고객의 질문을 카테고리로 자동 분류하여 적절한 처리 경로 결정

**핵심 요구사항**:
- OpenAI API로 문의 내용을 분석하여 카테고리 추출
- 분류 카테고리 예시: `상품문의`, `배송문의`, `반품/교환`, `기타`
- 분류 신뢰도(confidence score) 계산
- 신뢰도가 낮으면 에스컬레이션 후보로 마킹

**충돌 영역**:
- DB 테이블: `category`, `conversation` (category_id 컬럼)
- 백엔드 모듈: `classification.service.ts`, `openai.service.ts`
- API 엔드포인트: `POST /api/classify`

---

### F-03: AI 기반 자동 답변
**목적**: 분류된 문의에 대해 맥락을 이해하고 자연스러운 답변 생성

**핵심 요구사항**:
- OpenAI API로 대화 맥락 기반 답변 생성
- 이전 대화 이력을 프롬프트에 포함 (최근 5개 메시지)
- 답변 불가능 판단 시 "상담원 연결이 필요합니다" 응답
- 재시도 로직 (API 실패 시 최대 3회, 지수 백오프)

**충돌 영역**:
- DB 테이블: `message`, `conversation`
- 백엔드 모듈: `chat.service.ts`, `openai.service.ts`
- API 엔드포인트: `POST /api/chat`

---

### F-04: 대화 이력 저장 및 조회
**목적**: 모든 대화를 영구 저장하고, 사용자별/기간별 검색 가능

**핵심 요구사항**:
- 메시지 송수신 시 DB에 실시간 저장
- 대화 세션 단위로 그룹핑 (`conversation` 테이블)
- 검색 조건: 사용자, 날짜 범위, 카테고리, 키워드
- 페이지네이션 (무한 스크롤)
- Soft delete (삭제 플래그)

**충돌 영역**:
- DB 테이블: `conversation`, `message`
- 백엔드 모듈: `conversation.service.ts`
- API 엔드포인트: `GET /api/conversations`, `GET /api/conversations/:id/messages`

---

### F-05: 실시간 챗봇 UI
**목적**: 고객이 웹 브라우저에서 실시간으로 챗봇과 대화

**핵심 요구사항**:
- WebSocket 연결 (Socket.io 또는 native WebSocket)
- 메시지 입력창 + 대화 목록
- 타이핑 인디케이터 ("챗봇이 입력 중...")
- 연결 상태 표시 (연결됨/연결 끊김/재연결 중)
- 자동 재연결 (네트워크 끊김 시)

**충돌 영역**:
- 프론트엔드: `components/ChatWindow.tsx`, `components/MessageList.tsx`
- 백엔드: `websocket.service.ts`
- WebSocket 이벤트: `message`, `typing`, `connect`, `disconnect`

---

### F-06: 상담원 에스컬레이션
**목적**: AI가 처리할 수 없는 문의를 상담원에게 전달

**핵심 요구사항**:
- 에스컬레이션 조건:
  - 분류 신뢰도가 임계값(70%) 이하
  - 사용자가 명시적으로 "상담원 연결" 요청
  - AI가 "답변 불가"로 판단
- 에스컬레이션 큐에 추가 (`escalation` 테이블)
- 상담원에게 알림 (이메일 또는 대시보드 알림)
- 상태 관리: `pending`, `assigned`, `resolved`

**충돌 영역**:
- DB 테이블: `escalation`, `conversation` (escalated_at 컬럼)
- 백엔드 모듈: `escalation.service.ts`
- API 엔드포인트: `POST /api/escalate`, `GET /api/escalations`

---

### F-07: 답변 템플릿 관리
**목적**: 관리자가 자주 묻는 질문(FAQ)의 답변을 직접 등록/수정

**핵심 요구사항**:
- CRUD API (생성, 조회, 수정, 삭제)
- 템플릿 필드: 질문 패턴, 답변 내용, 카테고리
- 관리자 전용 페이지 (`/admin/templates`)
- AI 답변 생성 시 템플릿 우선 매칭 (키워드 기반)

**충돌 영역**:
- DB 테이블: `faq_template`
- 백엔드 모듈: `template.service.ts`
- 프론트엔드: `app/admin/templates/page.tsx`
- API 엔드포인트: `GET/POST/PUT/DELETE /api/templates`

---

### F-08: 관리자 대시보드
**목적**: 챗봇 운영 현황을 한눈에 파악

**핵심 요구사항**:
- 주요 지표:
  - 일일 대화 건수
  - 자동 해결률 (에스컬레이션 비율의 역수)
  - 카테고리별 문의 분포 (파이 차트)
  - 평균 응답 시간
  - 고객 만족도 평균
- 기간 필터 (오늘/이번 주/이번 달)
- 실시간 업데이트 (WebSocket 또는 폴링)

**충돌 영역**:
- 프론트엔드: `app/admin/dashboard/page.tsx`, `components/Chart.tsx`
- 백엔드 모듈: `analytics.service.ts`
- API 엔드포인트: `GET /api/analytics`

---

### F-09: 고객 만족도 피드백
**목적**: 대화 종료 후 사용자가 만족도를 평가하여 개선점 도출

**핵심 요구사항**:
- 대화 종료 시 팝업 표시 ("이 대화가 도움이 되었나요?")
- 평가 옵션: 👍 좋음 / 👎 나쁨 (선택적으로 이유 입력)
- 피드백을 `feedback` 테이블에 저장
- 대시보드에서 만족도 추이 시각화

**충돌 영역**:
- DB 테이블: `feedback`, `conversation` (has_feedback 플래그)
- 백엔드 모듈: `feedback.service.ts`
- 프론트엔드: `components/FeedbackModal.tsx`
- API 엔드포인트: `POST /api/feedback`

---

### F-10: 다국어 지원
**목적**: 한국어와 영어 고객 모두 지원

**핵심 요구사항**:
- 사용자 메시지 언어 자동 감지 (OpenAI API 또는 언어 감지 라이브러리)
- 감지된 언어로 답변 생성
- UI 언어 전환 (한국어/영어)
- 관리자 템플릿도 다국어 버전 등록 가능

**충돌 영역**:
- 백엔드 모듈: `openai.service.ts` (프롬프트 다국어 처리)
- 프론트엔드: `lib/i18n.ts`, 모든 UI 텍스트
- DB 테이블: `faq_template` (language 컬럼 추가)

---

## 마일스톤별 기능 배치 요약

- **M1 (MVP — 핵심 대화 기능)**: F-01 (인증) → PG-1 [F-02 (분류) + F-03 (답변) + F-04 (이력)]
- **M2 (사용자 인터페이스 완성)**: F-05 (실시간 UI) → F-06 (에스컬레이션)
- **M3 (운영 및 개선 도구)**: F-07 (템플릿 관리) → PG-2 [F-08 (대시보드) + F-09 (피드백)]
- **M4 (추가 기능)**: F-10 (다국어 지원)

---

## 작업 가이드

### 다음 기능 선택 시 고려사항
1. **의존성 체크**: 의존하는 기능이 모두 완료되었는지 확인
2. **마일스톤 경계**: 마일스톤을 넘어가면 `/auto-dev`가 중단되어 사용자 확인 요청
3. **병렬 가능 여부**: 같은 PG 그룹의 기능은 Agent Team으로 병렬 실행 고려
4. **우선순위**: Must → Should → Could 순서로 진행

### 완료 처리
- 기능 구현 완료 시 상태를 `✅ 완료`로 업데이트
- 의존하는 후속 기능이 있으면 자동으로 다음 후보가 됨
