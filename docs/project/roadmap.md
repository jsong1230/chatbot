# 프로젝트 로드맵

> PRD: docs/project/prd.md
> 백로그: docs/project/features.md

---

## 로드맵 개요

이 프로젝트는 4개의 마일스톤으로 구성되며, 각 마일스톤은 독립적으로 배포 가능한 단위입니다.
의존성 체인을 고려하여 순차적으로 진행하되, 병렬 그룹(PG-*)을 활용하여 개발 속도를 최적화합니다.

---

## Milestone 1: MVP — 핵심 대화 기능

**목표**: 고객이 챗봇과 기본적인 대화를 주고받을 수 있는 최소 기능 제품(MVP) 완성

**기간**: 약 2-3주 (추정)

**포함 기능**:
- F-01: 사용자 인증 (회원가입/로그인, JWT)
- F-02: 문의 자동 분류 (OpenAI API)
- F-03: AI 기반 자동 답변 (OpenAI API)
- F-04: 대화 이력 저장 및 조회

**작업 순서**:
1. **F-01 (사용자 인증)** — 순차 실행 (모든 기능의 기반)
   - DB 스키마: `user`, `session` 테이블 생성
   - 백엔드: 회원가입/로그인 API, JWT 토큰 발급
   - 프론트엔드: 로그인 페이지
   - 테스트: 인증 플로우 E2E 테스트

2. **PG-1 (병렬 그룹 1)** — F-02, F-03, F-04 병렬 실행 가능
   - **F-02 (문의 자동 분류)**:
     - DB: `category` 테이블, `conversation.category_id` 컬럼
     - 백엔드: `classification.service.ts`, OpenAI 분류 프롬프트
     - API: `POST /api/classify`
   - **F-03 (AI 기반 자동 답변)**:
     - DB: `message` 테이블
     - 백엔드: `chat.service.ts`, OpenAI 답변 생성 프롬프트
     - API: `POST /api/chat`
   - **F-04 (대화 이력 저장 및 조회)**:
     - DB: `conversation`, `message` 테이블 (최종 스키마 확정)
     - 백엔드: `conversation.service.ts`
     - API: `GET /api/conversations`, `GET /api/conversations/:id/messages`

**완료 기준**:
- ✅ 사용자 회원가입 후 로그인 가능
- ✅ 고객이 메시지를 보내면 OpenAI가 카테고리를 분류하고 답변 생성
- ✅ 대화 내역이 DB에 저장되고 조회 가능
- ✅ Postman/REST Client로 모든 API 엔드포인트 테스트 통과
- ✅ 백엔드 단위 테스트 80% 이상 커버리지

**산출물**:
- `docs/specs/사용자인증/requirements.md`, `design.md`, `plan.md`
- `docs/specs/문의자동분류/requirements.md`, `design.md`, `plan.md`
- `docs/specs/AI자동답변/requirements.md`, `design.md`, `plan.md`
- `docs/specs/대화이력관리/requirements.md`, `design.md`, `plan.md`
- `docs/api/auth.md`, `docs/api/chat.md`, `docs/api/conversation.md`
- `docs/db/schema-v1.md` (초기 스키마)
- DB 마이그레이션 파일 (Prisma)
- 백엔드 코드: `backend/src/routes/`, `backend/src/services/`
- 프론트엔드 코드: `frontend/src/app/login/`, `frontend/src/lib/api-client.ts`

**리스크 및 대응**:
- **OpenAI API 호출 실패**: 재시도 로직 + 폴백 메시지 구현
- **병렬 작업 시 DB 스키마 충돌**: `conversation`, `message` 테이블 스키마를 F-01 단계에서 설계 확정 후 진행

---

## Milestone 2: 사용자 인터페이스 완성

**목표**: 고객이 웹 브라우저에서 실시간으로 챗봇과 대화하고, 필요 시 상담원에게 에스컬레이션

**기간**: 약 1-2주 (추정)

**포함 기능**:
- F-05: 실시간 챗봇 UI (WebSocket)
- F-06: 상담원 에스컬레이션

**작업 순서**:
1. **F-05 (실시간 챗봇 UI)** — 순차 실행
   - 백엔드: WebSocket 서버 구현 (Socket.io)
   - 프론트엔드: `ChatWindow.tsx`, `MessageList.tsx` 컴포넌트
   - WebSocket 이벤트: `message`, `typing`, `connect`, `disconnect`
   - 테스트: WebSocket 연결/재연결 테스트

2. **F-06 (상담원 에스컬레이션)** — 순차 실행 (F-05 완료 후)
   - DB: `escalation` 테이블
   - 백엔드: `escalation.service.ts`, 에스컬레이션 조건 로직
   - API: `POST /api/escalate`, `GET /api/escalations`
   - 프론트엔드: 에스컬레이션 버튼 + 알림 UI

**완료 기준**:
- ✅ 고객이 웹 브라우저에서 채팅창을 열고 실시간으로 메시지 송수신
- ✅ 타이핑 인디케이터 표시 ("챗봇이 입력 중...")
- ✅ 네트워크 끊김 시 자동 재연결
- ✅ 분류 신뢰도 낮은 문의는 자동으로 에스컬레이션 큐에 추가
- ✅ Playwright E2E 테스트 통과 (실시간 채팅 플로우)

**산출물**:
- `docs/specs/실시간챗봇UI/requirements.md`, `design.md`, `plan.md`
- `docs/specs/상담원에스컬레이션/requirements.md`, `design.md`, `plan.md`
- `docs/api/websocket.md`, `docs/api/escalation.md`
- `docs/db/schema-v2.md` (`escalation` 테이블 추가)
- `docs/components/ChatWindow.md`, `docs/components/MessageList.md`
- 백엔드 코드: `backend/src/websocket.service.ts`, `backend/src/services/escalation.service.ts`
- 프론트엔드 코드: `frontend/src/components/ChatWindow.tsx`, `frontend/src/app/chat/page.tsx`

**의존성**:
- M1 완료 필요 (F-01, F-02, F-03, F-04가 선행되어야 WebSocket으로 대화 가능)

---

## Milestone 3: 운영 및 개선 도구

**목표**: 관리자가 챗봇 운영 현황을 모니터링하고, 답변 품질을 개선할 수 있는 도구 제공

**기간**: 약 2주 (추정)

**포함 기능**:
- F-07: 답변 템플릿 관리 (FAQ CRUD)
- F-08: 관리자 대시보드 (통계 시각화)
- F-09: 고객 만족도 피드백

**작업 순서**:
1. **F-07 (답변 템플릿 관리)** — 순차 실행
   - DB: `faq_template` 테이블
   - 백엔드: `template.service.ts`, CRUD API
   - 프론트엔드: `/admin/templates` 페이지 (테이블 + 폼)
   - 테스트: 템플릿 CRUD E2E 테스트

2. **PG-2 (병렬 그룹 2)** — F-08, F-09 병렬 실행 가능
   - **F-08 (관리자 대시보드)**:
     - 백엔드: `analytics.service.ts`, 통계 집계 로직
     - API: `GET /api/analytics`
     - 프론트엔드: `/admin/dashboard` 페이지, 차트 컴포넌트 (Chart.js 또는 Recharts)
   - **F-09 (고객 만족도 피드백)**:
     - DB: `feedback` 테이블
     - 백엔드: `feedback.service.ts`
     - API: `POST /api/feedback`
     - 프론트엔드: `FeedbackModal.tsx` (대화 종료 시 팝업)

**완료 기준**:
- ✅ 관리자가 FAQ 템플릿을 등록/수정/삭제 가능
- ✅ AI 답변 생성 시 템플릿 우선 매칭 (키워드 기반)
- ✅ 대시보드에서 일일 대화 건수, 자동 해결률, 카테고리 분포 확인 가능
- ✅ 고객이 대화 종료 후 만족도 평가 가능
- ✅ 대시보드에서 만족도 추이 확인 가능

**산출물**:
- `docs/specs/답변템플릿관리/requirements.md`, `design.md`, `plan.md`
- `docs/specs/관리자대시보드/requirements.md`, `design.md`, `plan.md`
- `docs/specs/만족도피드백/requirements.md`, `design.md`, `plan.md`
- `docs/api/template.md`, `docs/api/analytics.md`, `docs/api/feedback.md`
- `docs/db/schema-v3.md` (`faq_template`, `feedback` 테이블 추가)
- `docs/components/Dashboard.md`, `docs/components/FeedbackModal.md`
- 백엔드 코드: `backend/src/services/template.service.ts`, `backend/src/services/analytics.service.ts`
- 프론트엔드 코드: `frontend/src/app/admin/`, `frontend/src/components/FeedbackModal.tsx`

**의존성**:
- M2 완료 필요 (F-04, F-06이 선행되어야 통계 데이터 집계 가능)

---

## Milestone 4: 추가 기능 (확장)

**목표**: 다국어 지원으로 글로벌 사용자 대응

**기간**: 약 1주 (추정)

**포함 기능**:
- F-10: 다국어 지원 (한국어/영어)

**작업 순서**:
1. **F-10 (다국어 지원)** — 순차 실행
   - 백엔드: 언어 감지 로직, OpenAI 프롬프트 다국어 처리
   - DB: `faq_template.language` 컬럼 추가
   - 프론트엔드: i18n 라이브러리 통합 (next-i18next 또는 react-i18next)
   - UI 텍스트 한국어/영어 번역
   - 테스트: 언어 전환 E2E 테스트

**완료 기준**:
- ✅ 사용자 메시지 언어 자동 감지 (한국어/영어)
- ✅ 감지된 언어로 답변 생성
- ✅ UI 언어 전환 버튼 (한국어 ↔ 영어)
- ✅ FAQ 템플릿도 다국어 버전 등록 가능

**산출물**:
- `docs/specs/다국어지원/requirements.md`, `design.md`, `plan.md`
- `docs/api/i18n.md`
- `docs/db/schema-v4.md` (`faq_template.language` 컬럼)
- 백엔드 코드: `backend/src/services/openai.service.ts` (다국어 프롬프트)
- 프론트엔드 코드: `frontend/src/lib/i18n.ts`, 번역 파일 (`locales/ko.json`, `locales/en.json`)

**의존성**:
- M1 완료 필요 (F-02, F-03에서 OpenAI 서비스 기반 구축)

**우선순위**:
- Could 등급이므로, 리소스 부족 시 M4는 연기 가능

---

## 마일스톤 간 의존성 요약

```
M1 (MVP — 핵심 대화 기능)
  ├──▶ M2 (사용자 인터페이스 완성)
  │     └──▶ M3 (운영 및 개선 도구)
  └──▶ M4 (추가 기능) — 독립적이지만 M1 기반 필요
```

- **M1 → M2**: M1이 완료되어야 실시간 채팅 UI와 에스컬레이션 구현 가능
- **M2 → M3**: M2가 완료되어야 통계 데이터 수집 및 피드백 기능 구현 가능
- **M1 → M4**: M1이 완료되어야 다국어 프롬프트 확장 가능 (M2, M3와는 독립적)

---

## 배포 전략

### M1 배포 (내부 테스트)
- 목적: 핵심 기능 검증
- 대상: 내부 팀원 10명
- 환경: 스테이징 서버 (Docker)
- 검증 항목: API 응답 정확도, OpenAI 분류 정확도, 응답 시간

### M2 배포 (베타 테스트)
- 목적: 실제 고객 반응 확인
- 대상: 외부 베타 테스터 50명
- 환경: 프로덕션 서버 (제한된 접근)
- 검증 항목: WebSocket 안정성, 에스컬레이션 정확도, 사용자 경험

### M3 배포 (정식 출시)
- 목적: 전체 고객 대상 서비스 오픈
- 대상: 모든 고객
- 환경: 프로덕션 서버 (전체 공개)
- 모니터링: 대시보드로 실시간 지표 추적

### M4 배포 (글로벌 확장)
- 목적: 해외 고객 대응
- 대상: 영어권 고객 추가
- 환경: 프로덕션 서버 (다국어 지원)

---

## 성공 지표 및 검증 계획

### M1 검증 (MVP)
- ✅ API 응답 시간 3초 이내 (OpenAI 호출 포함)
- ✅ 문의 분류 정확도 70% 이상 (내부 테스트 데이터 100건 기준)
- ✅ 백엔드 단위 테스트 커버리지 80% 이상

### M2 검증 (UI 완성)
- ✅ WebSocket 연결 성공률 95% 이상
- ✅ 에스컬레이션 비율 30% 이하 (과도한 에스컬레이션 방지)
- ✅ E2E 테스트 통과율 100%

### M3 검증 (운영 도구)
- ✅ 대시보드 로딩 시간 2초 이내
- ✅ 고객 만족도 피드백 응답률 50% 이상
- ✅ FAQ 템플릿 매칭률 30% 이상 (AI 답변 대비)

### M4 검증 (다국어)
- ✅ 언어 감지 정확도 90% 이상
- ✅ 영어 답변 품질 한국어와 동등 (주관적 평가)

---

## 리스크 관리

### 기술 리스크
| 리스크 | 영향도 | 완화 방안 | 담당 마일스톤 |
|--------|--------|-----------|--------------|
| OpenAI API 장애 | High | 재시도 로직, 폴백 메시지, 헬스체크 | M1 |
| WebSocket 연결 불안정 | Medium | 자동 재연결, 메시지 큐잉 | M2 |
| DB 성능 저하 (대화 이력 증가) | Medium | 인덱싱, 파티셔닝, 페이지네이션 | M1, M3 |
| 동시 접속자 증가 | Medium | 수평 확장 (Docker), Redis 캐싱 | M3 |

### 일정 리스크
| 리스크 | 영향도 | 완화 방안 |
|--------|--------|-----------|
| M1 병렬 작업 스키마 충돌 | Medium | 사전 설계 확정, 코드 리뷰 강화 |
| OpenAI API 응답 지연 | Low | 타임아웃 설정, 비동기 처리 |
| 테스트 시나리오 부족 | Low | 사전 테스트 계획 수립 (product-manager) |

---

## 다음 단계

1. **사용자 검토**: PRD, 기능 백로그, 로드맵을 리뷰하고 피드백
2. **M1 시작 승인**: 사용자가 승인하면 `/auto-dev` 또는 `/next-feature`로 F-01부터 개발 시작
3. **각 기능별 상세 분석**: product-manager가 requirements.md 작성, architect가 design.md 작성
4. **구현 및 테스트**: backend-dev, frontend-dev가 코드 구현, test-runner가 검증
5. **문서화 및 커밋**: doc-writer가 운영 문서 작성, code-reviewer가 최종 검증 후 커밋

---

## 참고 사항

- **병렬 그룹 활용**: M1의 PG-1, M3의 PG-2는 Agent Team + worktree로 병렬 개발 가능
- **마일스톤 경계**: `/auto-dev`는 마일스톤 경계에서 멈추고 사용자 확인 요청
- **우선순위 변경**: Should/Could 기능은 리소스 부족 시 연기 가능 (사용자와 협의 필요)
