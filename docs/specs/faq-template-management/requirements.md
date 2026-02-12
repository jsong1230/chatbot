# 답변 템플릿 관리 (F-07) — 요구사항 분석서

## 1. 개요

- **기능명**: 답변 템플릿 관리 (FAQ Template Management)
- **기능 ID**: F-07
- **목적**: 관리자가 자주 묻는 질문(FAQ)의 답변을 직접 등록하고 관리하여, AI 답변 품질을 개선하고 일관성 있는 답변을 제공
- **대상 사용자**: 관리자 (UserRole: admin)
- **요청 배경**:
  - F-03(AI 기반 자동 답변) 기능이 구현되어 있으나, 자주 묻는 질문에 대해 매번 AI를 호출하는 것은 비효율적
  - 일부 질문은 정책적으로 정해진 답변이 있어야 하며, AI의 창의적 답변이 오히려 혼란을 줄 수 있음
  - 관리자가 직접 답변을 등록하면 응답 속도가 빠르고, AI API 비용을 절감할 수 있음
  - 템플릿 매칭 실패 시 기존 AI 답변 생성 로직으로 폴백하여 유연성 유지

## 2. 기능 요구사항 (Functional Requirements)

### FR-1: 템플릿 CRUD (관리자 전용)

#### FR-1.1: 템플릿 생성
- **설명**: 관리자가 새로운 FAQ 템플릿을 등록합니다.
- **유저 스토리**: As an **admin**, I want to **register a new FAQ template**, so that **customers get consistent answers to common questions**.
- **우선순위**: Must
- **입력 필드**:
  - `question` (필수, 10~500자): 질문 패턴 (예: "배송 기간이 얼마나 걸리나요?")
  - `answer` (필수, 10~2000자): 답변 내용
  - `keywords` (선택, 배열): 매칭에 사용할 키워드 (예: ["배송", "기간", "소요"])
  - `categoryId` (선택): 특정 카테고리에만 적용 (null이면 전체 카테고리)
  - `priority` (선택, 기본값 0): 우선순위 (높을수록 먼저 매칭 시도)
  - `isActive` (선택, 기본값 true): 활성화 여부
- **검증 규칙**:
  - question은 중복 불가 (대소문자 구분 없음)
  - keywords는 최대 20개, 각 키워드는 2~50자
  - priority는 -100 ~ 100 범위
- **성공 응답**: 201 Created, 생성된 템플릿 정보 반환
- **실패 응답**: 400 (검증 오류), 409 (중복 질문), 403 (권한 없음)

#### FR-1.2: 템플릿 조회
- **설명**: 관리자가 등록된 템플릿 목록을 조회합니다.
- **유저 스토리**: As an **admin**, I want to **view all FAQ templates**, so that **I can review and manage them**.
- **우선순위**: Must
- **조회 조건**:
  - 카테고리별 필터 (categoryId)
  - 활성화 상태 필터 (isActive)
  - 키워드 검색 (question 또는 answer 내용)
  - 정렬: priority (내림차순), createdAt (최신순)
- **페이지네이션**: 기본 20개, 최대 100개
- **성공 응답**: 200 OK, 템플릿 목록 + 페이지 정보
- **실패 응답**: 403 (권한 없음)

#### FR-1.3: 템플릿 수정
- **설명**: 관리자가 기존 템플릿을 수정합니다.
- **유저 스토리**: As an **admin**, I want to **update an existing template**, so that **I can improve answers based on customer feedback**.
- **우선순위**: Must
- **수정 가능 필드**: question, answer, keywords, categoryId, priority, isActive
- **검증 규칙**: FR-1.1과 동일
- **성공 응답**: 200 OK, 수정된 템플릿 정보
- **실패 응답**: 400 (검증 오류), 404 (템플릿 없음), 403 (권한 없음)

#### FR-1.4: 템플릿 삭제
- **설명**: 관리자가 템플릿을 삭제합니다 (Soft Delete 권장).
- **유저 스토리**: As an **admin**, I want to **delete obsolete templates**, so that **they don't interfere with answer matching**.
- **우선순위**: Must
- **삭제 방식**: Soft Delete (deletedAt 필드 사용)
- **성공 응답**: 204 No Content
- **실패 응답**: 404 (템플릿 없음), 403 (권한 없음)

---

### FR-2: 템플릿 매칭 로직 (자동 답변 시)

#### FR-2.1: 키워드 기반 매칭
- **설명**: 사용자 메시지에 템플릿의 키워드가 포함되면 해당 템플릿을 우선 사용합니다.
- **유저 스토리**: As a **customer**, I want to **get instant answers to common questions**, so that **I don't have to wait for AI processing**.
- **우선순위**: Must
- **매칭 알고리즘**:
  1. 사용자 메시지를 소문자로 변환하고 공백 정규화
  2. 활성화된 템플릿(isActive=true) 중에서 검색
  3. 카테고리 필터링 (conversation.categoryId가 있으면 해당 카테고리 템플릿 우선)
  4. keywords 배열의 모든 키워드가 메시지에 포함되면 매칭 점수 계산
     - 키워드 매칭 개수 × 10점
     - priority 값 추가
  5. 점수가 가장 높은 템플릿 선택 (동점이면 createdAt 최신 우선)
  6. 매칭 실패 시 기존 OpenAI API 호출 (폴백)
- **매칭 예시**:
  - 사용자 메시지: "배송 기간이 얼마나 걸리나요?"
  - 템플릿 키워드: ["배송", "기간"] → 2개 매칭 → 점수: 20 + priority
- **성능 목표**: 매칭 시간 50ms 이내

#### FR-2.2: 매칭 결과 로깅
- **설명**: 템플릿 매칭 여부를 로그로 기록하여 효과를 추적합니다.
- **우선순위**: Should
- **로그 정보**:
  - 매칭 성공/실패 여부
  - 매칭된 템플릿 ID
  - 매칭 점수
  - 매칭 시간 (ms)
- **저장 위치**: message.metadata 필드
  ```json
  {
    "source": "template",
    "templateId": "uuid",
    "matchScore": 25,
    "matchTimeMs": 12
  }
  ```

#### FR-2.3: 폴백 전략
- **설명**: 템플릿 매칭 실패 시 기존 OpenAI API 로직으로 자동 폴백합니다.
- **우선순위**: Must
- **폴백 조건**:
  - 매칭된 템플릿이 없음
  - 매칭 점수가 임계값(예: 10점) 미만
  - 템플릿 조회 중 에러 발생
- **폴백 동작**: F-03의 `generateAnswer()` 함수 호출
- **로그 기록**: 폴백 사유를 message.metadata에 기록

---

### FR-3: 관리자 페이지 (프론트엔드)

#### FR-3.1: 템플릿 목록 화면
- **설명**: 관리자가 등록된 템플릿을 한눈에 볼 수 있는 페이지
- **유저 스토리**: As an **admin**, I want to **see all templates in a table**, so that **I can quickly find and manage them**.
- **우선순위**: Should
- **위치**: `/admin/templates`
- **표시 항목**:
  - question (질문)
  - 카테고리명 (category.name)
  - 활성화 상태 (isActive)
  - 우선순위 (priority)
  - 생성일 (createdAt)
  - 액션 버튼 (수정, 삭제)
- **기능**:
  - 카테고리 필터 드롭다운
  - 활성화 상태 토글 필터
  - 검색 입력창 (질문/답변 내용 검색)
  - 페이지네이션

#### FR-3.2: 템플릿 생성/수정 폼
- **설명**: 관리자가 템플릿을 추가하거나 수정하는 폼
- **우선순위**: Should
- **위치**: `/admin/templates/new`, `/admin/templates/:id/edit`
- **폼 필드**:
  - question (텍스트 입력, 500자 제한)
  - answer (텍스트 영역, 2000자 제한)
  - keywords (태그 입력, 최대 20개)
  - categoryId (드롭다운, "전체 카테고리" 옵션 포함)
  - priority (숫자 입력, -100 ~ 100)
  - isActive (체크박스)
- **검증**:
  - 실시간 글자 수 표시
  - 필수 필드 미입력 시 제출 불가
  - 중복 질문 경고 (API 응답 기반)
- **성공 동작**: 목록 페이지로 리다이렉트 + 성공 토스트 메시지

#### FR-3.3: 템플릿 미리보기
- **설명**: 템플릿을 저장하기 전에 실제 화면에서 어떻게 보이는지 미리보기
- **우선순위**: Could
- **동작**: 폼 우측에 실시간 미리보기 패널 표시 (Markdown 렌더링 지원 선택)

---

### FR-4: 통계 및 개선

#### FR-4.1: 템플릿 사용 통계
- **설명**: 각 템플릿이 얼마나 사용되었는지 추적합니다.
- **우저 스토리**: As an **admin**, I want to **see which templates are most used**, so that **I can optimize frequently accessed answers**.
- **우선순위**: Could
- **통계 항목**:
  - 템플릿별 사용 횟수 (usageCount)
  - 최근 사용 일시 (lastUsedAt)
  - 사용률 (템플릿 사용 / 전체 메시지)
- **표시 위치**: 관리자 대시보드 (F-08) 또는 템플릿 목록

#### FR-4.2: 미매칭 질문 로그
- **설명**: 템플릿 매칭에 실패한 질문을 로그로 수집하여 신규 템플릿 아이디어 제공
- **우선순위**: Could
- **수집 정보**:
  - 사용자 메시지 (개인정보 마스킹 후)
  - 카테고리
  - 발생 빈도
- **표시 위치**: 관리자 페이지에 "미매칭 질문 TOP 10" 섹션

---

## 3. 비기능 요구사항 (Non-Functional Requirements)

### NFR-1: 보안
- 관리자 전용 기능: JWT 토큰 검증 + 역할(UserRole.admin) 확인 필수
- 템플릿 내용은 XSS 공격 방지를 위해 입력값 sanitize (특수문자 이스케이프)
- API 엔드포인트에 Rate Limiting 적용 (관리자당 분당 30회)

### NFR-2: 성능
- 템플릿 매칭: 50ms 이내 완료 (인덱스 활용)
- 템플릿 조회: 100ms 이내 응답 (페이지네이션 포함)
- 전체 템플릿 수가 1,000개 이상일 경우에도 성능 저하 없음

### NFR-3: 확장성
- 템플릿 매칭 알고리즘은 플러그인 형태로 분리하여 향후 NLP 기반 매칭으로 교체 가능
- 다국어 지원(F-10) 시 템플릿에 language 필드 추가 가능하도록 스키마 설계

### NFR-4: 가용성
- 템플릿 조회 실패 시 자동으로 OpenAI API 폴백 (답변 중단 방지)
- 템플릿 DB 장애 시에도 기존 AI 답변 로직은 정상 작동

### NFR-5: 유지보수성
- 템플릿 매칭 로직은 별도 서비스(TemplateService)로 분리
- 매칭 알고리즘 변경 시 기존 chat.service.ts 코드 수정 최소화
- 템플릿 CRUD API는 RESTful 원칙 준수

---

## 4. 제약사항 및 가정

### 제약사항
- **기존 F-03 수정 필요**: chat.service.ts의 `processMessage()` 함수에 템플릿 매칭 로직 추가
- **권한 검증 의존**: F-01 인증 시스템의 JWT 미들웨어와 역할 검증 로직 활용
- **카테고리 연동**: F-02의 category 테이블과 관계 설정 필요
- **모바일 지원**: 관리자 페이지는 데스크톱 우선 (모바일 UI 최적화는 선택)

### 가정
- 관리자는 한국어 질문/답변만 등록 (F-10 다국어 지원은 별도 고려)
- 템플릿 개수는 초기에 100개 이하, 장기적으로 1,000개 이하
- 템플릿 매칭 실패 시 AI 답변이 항상 가능하다 (OpenAI API 정상 작동 전제)
- 템플릿은 Plain Text 형식 (Markdown은 선택적, 이모지 허용)

---

## 5. 범위 외 (Out of Scope)

이번 F-07 기능에서 **구현하지 않는** 것들:
- 템플릿 버전 관리 (변경 이력 추적)
- 템플릿 승인 워크플로우 (작성자와 승인자 분리)
- NLP 기반 의미론적 매칭 (현재는 키워드 기반만)
- 템플릿 A/B 테스트
- 템플릿 자동 생성 (AI가 과거 대화에서 학습하여 템플릿 제안)
- 다국어 템플릿 (F-10에서 별도 구현)

---

## 6. 용어 정의

| 용어 | 정의 |
|------|------|
| **템플릿 (Template)** | 관리자가 등록한 FAQ 질문과 답변 쌍 |
| **키워드 (Keywords)** | 템플릿 매칭에 사용되는 검색어 배열 |
| **매칭 점수 (Match Score)** | 사용자 메시지와 템플릿 간 유사도 점수 (키워드 개수 × 10 + priority) |
| **폴백 (Fallback)** | 템플릿 매칭 실패 시 OpenAI API를 호출하는 대체 전략 |
| **우선순위 (Priority)** | 같은 점수의 템플릿이 여러 개일 때 선택 기준 (-100 ~ 100) |
| **활성화 상태 (isActive)** | 템플릿 사용 가능 여부 (false면 매칭 대상에서 제외) |

---

## 7. 성공 기준 (Success Criteria)

### 필수 (Must-Have)
- [ ] 관리자가 템플릿을 생성/조회/수정/삭제할 수 있음
- [ ] 사용자 메시지에 템플릿 키워드가 포함되면 해당 답변이 즉시 반환됨
- [ ] 템플릿 매칭 실패 시 자동으로 OpenAI API 호출 (기존 동작 유지)
- [ ] 템플릿 매칭 시 AI API 호출 없이 답변 생성 (응답 시간 1초 이내)
- [ ] 관리자 페이지에서 템플릿 목록 조회 및 필터링 가능
- [ ] 중복 질문 등록 방지 (409 에러 반환)

### 권장 (Should-Have)
- [ ] 관리자 페이지에서 템플릿 생성/수정 폼 제공 (UX 편의성)
- [ ] 템플릿 매칭 여부를 message.metadata에 로깅
- [ ] 카테고리별 템플릿 필터링 (특정 카테고리에서만 매칭)

### 선택 (Could-Have)
- [ ] 템플릿 사용 통계 (usageCount, lastUsedAt)
- [ ] 미매칭 질문 로그 수집 및 TOP 10 표시
- [ ] 템플릿 미리보기 기능 (폼 우측 패널)

### 측정 지표
- **템플릿 커버리지**: 전체 메시지 중 템플릿으로 답변된 비율 (목표: 30% 이상)
- **평균 응답 시간**: 템플릿 매칭 시 1초 이내 (AI 호출 시 2~5초 대비 개선)
- **AI API 비용 절감**: 월간 OpenAI API 호출 횟수 30% 감소
- **관리자 만족도**: 템플릿 관리 UX에 대한 관리자 피드백 (정성 평가)

---

## 8. 우선순위 요약

| 요구사항 ID | 내용 | 우선순위 | 비고 |
|------------|------|----------|------|
| FR-1.1 | 템플릿 생성 | Must | 백엔드 API 우선 구현 |
| FR-1.2 | 템플릿 조회 | Must | 필터링 + 페이지네이션 |
| FR-1.3 | 템플릿 수정 | Must | 검증 로직 FR-1.1과 공유 |
| FR-1.4 | 템플릿 삭제 | Must | Soft Delete 권장 |
| FR-2.1 | 키워드 기반 매칭 | Must | chat.service.ts 수정 필요 |
| FR-2.2 | 매칭 결과 로깅 | Should | 효과 측정용 |
| FR-2.3 | 폴백 전략 | Must | 기존 AI 로직 유지 |
| FR-3.1 | 템플릿 목록 화면 | Should | 프론트엔드 구현 |
| FR-3.2 | 생성/수정 폼 | Should | UX 편의성 |
| FR-3.3 | 미리보기 | Could | 선택 구현 |
| FR-4.1 | 사용 통계 | Could | 추후 개선 |
| FR-4.2 | 미매칭 로그 | Could | 추후 개선 |

---

## 9. 다음 단계

1. **Architect 설계**: 이 요구사항 분석서를 기반으로 architect가 `design.md` 작성
   - DB 스키마 설계 (faq_template 테이블)
   - API 엔드포인트 설계 (POST/GET/PUT/DELETE /api/templates)
   - 템플릿 매칭 알고리즘 상세 설계
   - F-03 chat.service.ts 수정 범위 명확화

2. **Product Manager 계획**: architect의 설계서를 기반으로 `plan.md` 작성
   - Phase 1: 백엔드 구현 (CRUD API + 매칭 로직)
   - Phase 2: 프론트엔드 구현 (관리자 페이지)
   - Phase 3: 테스트 및 리뷰

3. **의존성 확인**:
   - F-01 (사용자 인증): 완료 ✅ (JWT + 역할 검증 활용)
   - F-02 (문의 자동 분류): 완료 ✅ (카테고리 연동)
   - F-03 (AI 기반 자동 답변): 완료 ✅ (수정 필요)

---

## 10. 변경 이력

| 날짜 | 변경 내용 | 변경자 |
|------|-----------|--------|
| 2026-02-12 | 초안 작성 | product-manager |
