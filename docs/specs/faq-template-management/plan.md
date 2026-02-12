# 답변 템플릿 관리 (F-07) — 구현 계획서

## 1. 참조 문서
- **요구사항 분석서**: docs/specs/faq-template-management/requirements.md
- **기술 설계서**: docs/specs/faq-template-management/design.md

---

## 2. 구현 전략 개요

### 2.1 구현 순서
1. **Phase 1**: 백엔드 기반 구축 (DB → Service → API)
2. **Phase 2**: F-03 통합 (템플릿 매칭 로직)
3. **Phase 3**: 프론트엔드 구현 (관리자 페이지)
4. **Phase 4**: 테스트 및 검증
5. **Phase 5**: 문서화 및 마무리

### 2.2 병렬 실행 판단

**결론: 순차 실행 권장 (Agent Team 사용 불필요)**

**판단 근거**:
- **의존성 강함**: Phase 2(F-03 통합)는 Phase 1(백엔드 API) 완료가 필수
- **프론트엔드 의존**: Phase 3(프론트엔드)는 Phase 1의 API 스펙 확정 후 가능
- **작은 작업 단위**: 백엔드 파일 7개, 프론트엔드 파일 6개로 단일 에이전트가 처리 가능
- **충돌 위험**: chat.service.ts 수정(Phase 2)이 백엔드/프론트 모두에 영향
- **API 스펙 변경 가능성**: Phase 1 구현 중 API 스펙 조정 시 프론트엔드 재작업 발생

**순차 실행 장점**:
- Phase 1에서 API 스펙을 완전히 확정한 후 Phase 3 시작
- Phase 2에서 F-03 통합 시 발견되는 이슈를 Phase 1에서 반영 가능
- 단일 에이전트가 전체 컨텍스트를 유지하여 일관성 보장

**병렬 실행이 가능한 경우**:
- API 스펙이 100% 확정되고 변경 가능성이 0%일 때만
- 백엔드와 프론트엔드 개발자가 서로 다른 기능을 병렬 작업할 때

---

## 3. Phase별 구현 계획

### Phase 1: 백엔드 기반 구축 (DB, Service, API)

**담당**: backend-dev
**예상 소요 시간**: 2~3시간
**목표**: 템플릿 CRUD API 완성 + 매칭 로직 구현 (F-03 통합 제외)

#### Task 1-1: DB 스키마 및 마이그레이션 작성
- **생성 파일**:
  - `backend/prisma/schema.prisma` (수정)
    - FaqTemplate 모델 추가
    - Category 모델에 faqTemplates 관계 추가
  - `backend/prisma/migrations/YYYYMMDDHHMMSS_add_faq_template_table/migration.sql` (생성)
- **작업 내용**:
  - FaqTemplate 테이블 생성 (id, question, answer, keywords, categoryId, priority, isActive, usageCount, lastUsedAt, deletedAt, createdAt, updatedAt)
  - 인덱스 생성 (isActive, categoryId, priority, deletedAt)
  - UNIQUE 인덱스 (LOWER(question) WHERE deletedAt IS NULL)
  - 초기 샘플 데이터 추가 (선택)
- **검증 기준**:
  - `npx prisma migrate dev` 실행 성공
  - `npx prisma studio`에서 faq_template 테이블 확인
  - 샘플 데이터 1~2건 정상 삽입

#### Task 1-2: 타입 정의 작성
- **생성 파일**:
  - `backend/src/types/template.types.ts`
- **작업 내용**:
  - CreateTemplateDto: 템플릿 생성 DTO
  - UpdateTemplateDto: 템플릿 수정 DTO
  - TemplateQueryDto: 조회 필터 DTO
  - MatchedTemplate: 매칭 결과 타입
  - TemplateResponse: API 응답 타입
- **검증 기준**:
  - TypeScript 컴파일 에러 없음
  - 설계서(design.md) API 스펙과 일치

#### Task 1-3: 입력 검증 스키마 작성
- **생성 파일**:
  - `backend/src/validators/template.validator.ts`
- **작업 내용**:
  - Zod 스키마 정의 (createTemplateSchema, updateTemplateSchema, queryTemplateSchema)
  - 검증 규칙: question(10~500자), answer(10~2000자), keywords(최대 20개), priority(-100~100)
- **검증 기준**:
  - 유효한 입력값 통과
  - 무효한 입력값(글자 수 초과, 타입 오류) 거부

#### Task 1-4: 관리자 권한 미들웨어 작성
- **생성 파일**:
  - `backend/src/middleware/admin.middleware.ts`
- **작업 내용**:
  - requireAdmin() 함수: JWT 검증 + UserRole.admin 확인
  - F-01(인증 시스템)의 requireAuth 미들웨어 활용
  - 403 에러 반환 (관리자 아닐 시)
- **검증 기준**:
  - admin 역할 사용자 통과
  - user 역할 사용자 403 에러

#### Task 1-5: TemplateService 구현
- **생성 파일**:
  - `backend/src/services/template.service.ts`
- **작업 내용**:
  - **CRUD 함수**:
    - `createTemplate(data: CreateTemplateDto)`: 템플릿 생성, 중복 체크, 캐시 무효화
    - `getTemplates(query: TemplateQueryDto)`: 목록 조회, 필터링, 페이지네이션
    - `getTemplateById(id: string)`: 단일 템플릿 조회
    - `updateTemplate(id: string, data: UpdateTemplateDto)`: 템플릿 수정, 중복 체크, 캐시 무효화
    - `deleteTemplate(id: string)`: Soft Delete, 캐시 무효화
  - **매칭 함수**:
    - `matchTemplate(userMessage: string, categoryId?: string)`: 키워드 기반 매칭, 점수 계산
    - `getActiveTemplates()`: 활성 템플릿 조회 (캐시 활용)
    - `invalidateCache()`: 캐시 무효화
    - `updateUsageStats(templateId: string)`: 사용 통계 업데이트 (비동기)
  - **매칭 알고리즘** (design.md 6.1절 기준):
    - 메시지 정규화 (소문자, 공백 제거)
    - 키워드 전체 매칭 검증
    - 점수 계산: (매칭 키워드 개수 × 10) + priority + (카테고리 일치 시 +5)
    - 임계값 10점 이상 필터링
    - 최고 점수 선택 (동점 시 최신 템플릿)
  - **캐시 전략** (design.md 3.4절 기준):
    - 메모리 캐시 (Node.js 변수)
    - TTL 5분
    - 템플릿 생성/수정/삭제 시 즉시 무효화
- **검증 기준**:
  - 각 CRUD 함수 정상 동작
  - 매칭 알고리즘 정확성 (점수 계산, 임계값 필터링)
  - 캐시 히트/미스 시나리오 동작

#### Task 1-6: TemplateController 및 라우트 구현
- **생성 파일**:
  - `backend/src/controllers/template.controller.ts`
  - `backend/src/routes/template.routes.ts`
  - `backend/src/index.ts` (수정: 라우트 등록)
- **작업 내용**:
  - **Controller**:
    - `createTemplate()`: POST /api/templates 처리
    - `getTemplates()`: GET /api/templates 처리
    - `getTemplateById()`: GET /api/templates/:id 처리
    - `updateTemplate()`: PUT /api/templates/:id 처리
    - `deleteTemplate()`: DELETE /api/templates/:id 처리
  - **Router**:
    - 각 엔드포인트에 requireAuth + requireAdmin 미들웨어 적용
    - Rate Limiting 적용 (분당 30회)
    - validator 미들웨어 적용
  - **index.ts**:
    - `app.use('/api/templates', templateRoutes)` 등록
- **검증 기준**:
  - 각 API 엔드포인트 Postman/curl 테스트 성공
  - 관리자 권한 검증 동작 확인
  - 에러 케이스(400, 403, 404, 409) 정상 응답

#### Task 1-7: 유닛 테스트 작성
- **생성 파일**:
  - `backend/src/__tests__/services/template.service.test.ts`
- **테스트 케이스** (design.md 12.1절 기준):
  - `matchTemplate()`: 키워드 매칭 성공/실패
  - `matchTemplate()`: 점수 계산 정확성 (키워드, priority, 카테고리 보너스)
  - `matchTemplate()`: 동점 시 최신 템플릿 선택
  - `matchTemplate()`: 캐시 히트/미스
  - `createTemplate()`: 중복 질문 검증 (대소문자 무시)
  - `createTemplate()`: keywords 개수 제한 (최대 20개)
  - `createTemplate()`: priority 범위 검증 (-100 ~ 100)
  - `updateTemplate()`: 캐시 무효화 확인
  - `deleteTemplate()`: Soft Delete 확인
- **검증 기준**:
  - `npm test` 실행 시 모든 테스트 통과

**Phase 1 완료 기준**:
- [ ] 템플릿 CRUD API 4개 엔드포인트 정상 동작
- [ ] 관리자 권한 검증 동작 확인
- [ ] matchTemplate() 함수 정상 동작 (캐시, 점수 계산)
- [ ] 유닛 테스트 9개 이상 통과
- [ ] API 스펙 문서 작성 (docs/api/faq-template-management.md)

**Phase 1 산출물**:
- backend/prisma/schema.prisma (수정)
- backend/prisma/migrations/.../migration.sql (생성)
- backend/src/types/template.types.ts
- backend/src/validators/template.validator.ts
- backend/src/middleware/admin.middleware.ts
- backend/src/services/template.service.ts
- backend/src/controllers/template.controller.ts
- backend/src/routes/template.routes.ts
- backend/src/__tests__/services/template.service.test.ts
- docs/api/faq-template-management.md (backend-dev 작성)

---

### Phase 2: F-03 통합 (템플릿 매칭 로직)

**담당**: backend-dev
**예상 소요 시간**: 1~2시간
**목표**: ChatService에 템플릿 매칭 통합 + 폴백 로직 구현

#### Task 2-1: ChatService 수정
- **수정 파일**:
  - `backend/src/services/chat.service.ts`
- **작업 내용** (design.md 7.1절 기준):
  - TemplateService import 추가
  - `processMessage()` 함수 수정:
    1. 템플릿 매칭 시도 (TemplateService.matchTemplate() 호출)
    2. 매칭 성공 시:
       - 템플릿 답변 사용 (AI 호출 생략)
       - message.metadata에 `{ source: 'template', templateId, matchScore, matchTimeMs }` 기록
    3. 매칭 실패 시:
       - 기존 OpenAI API 호출 (폴백)
       - message.metadata에 `{ source: 'openai', ..., fallbackReason: '템플릿 매칭 실패' }` 기록
    4. AI 폴백 실패 시:
       - 시스템 메시지 반환
       - needsEscalation = true
- **최소 수정 원칙**:
  - 기존 입력/출력 인터페이스 변경 없음
  - 기존 에러 처리 로직 유지
  - 에스컬레이션 판단 로직 유지
- **검증 기준**:
  - 템플릿 매칭 성공 시 AI 호출 없이 답변 반환 (1초 이내)
  - 템플릿 매칭 실패 시 AI 호출 (기존 동작 유지)
  - message.metadata에 템플릿 정보 기록 확인

#### Task 2-2: 통합 테스트 작성
- **생성 파일**:
  - `backend/src/__tests__/services/chat.service.test.ts` (수정)
- **테스트 케이스**:
  - 템플릿 등록 → 사용자 메시지 전송 → 템플릿 답변 반환 확인
  - 템플릿 미매칭 → AI 폴백 확인
  - 템플릿 비활성화(isActive=false) → AI 폴백 확인
  - message.metadata에 템플릿 정보 기록 확인
  - 카테고리 일치 시 보너스 점수 적용 확인
- **검증 기준**:
  - 5개 이상 통합 테스트 통과

**Phase 2 완료 기준**:
- [ ] ChatService에 템플릿 매칭 로직 통합 완료
- [ ] 템플릿 매칭 성공 시 AI 호출 생략 확인
- [ ] 템플릿 매칭 실패 시 AI 폴백 정상 동작
- [ ] message.metadata 기록 확인
- [ ] 통합 테스트 5개 이상 통과

**Phase 2 산출물**:
- backend/src/services/chat.service.ts (수정)
- backend/src/__tests__/services/chat.service.test.ts (수정)
- docs/api/faq-template-management.md (F-03 통합 내용 추가)

---

### Phase 3: 프론트엔드 구현 (관리자 페이지)

**담당**: frontend-dev
**예상 소요 시간**: 3~4시간
**목표**: 관리자 템플릿 관리 페이지 완성
**의존성**: Phase 1 완료 필수 (API 스펙 확정)

#### Task 3-1: API 클라이언트 함수 작성
- **생성 파일**:
  - `frontend/src/lib/api/templates.ts`
- **작업 내용**:
  - `createTemplate(data)`: POST /api/templates
  - `getTemplates(query)`: GET /api/templates
  - `getTemplateById(id)`: GET /api/templates/:id
  - `updateTemplate(id, data)`: PUT /api/templates/:id
  - `deleteTemplate(id)`: DELETE /api/templates/:id
  - 에러 처리: 403(권한 없음), 409(중복 질문) 등
- **검증 기준**:
  - TypeScript 컴파일 에러 없음
  - Phase 1 API와 호환성 확인

#### Task 3-2: 템플릿 목록 페이지 구현
- **생성 파일**:
  - `frontend/src/app/admin/templates/page.tsx`
  - `frontend/src/components/admin/TemplateList.tsx`
- **작업 내용** (requirements.md FR-3.1 기준):
  - 템플릿 목록 테이블 (question, 카테고리명, 활성화 상태, 우선순위, 생성일, 액션 버튼)
  - 카테고리 필터 드롭다운
  - 활성화 상태 토글 필터
  - 검색 입력창 (질문/답변 내용 검색)
  - 페이지네이션 (기본 20개)
  - "새 템플릿 추가" 버튼 (→ /admin/templates/new)
  - 수정/삭제 버튼 (→ /admin/templates/:id/edit)
- **UI/UX**:
  - Tailwind CSS 스타일링
  - 로딩 상태 표시 (Skeleton UI)
  - 빈 목록 시 안내 메시지
  - 삭제 확인 모달
- **검증 기준**:
  - 목록 조회 정상 동작
  - 필터링 및 검색 정상 동작
  - 페이지네이션 동작 확인
  - 수정/삭제 버튼 클릭 시 정상 이동

#### Task 3-3: 템플릿 생성/수정 폼 구현
- **생성 파일**:
  - `frontend/src/app/admin/templates/new/page.tsx`
  - `frontend/src/app/admin/templates/[id]/edit/page.tsx`
  - `frontend/src/components/admin/TemplateForm.tsx`
- **작업 내용** (requirements.md FR-3.2 기준):
  - **폼 필드**:
    - question (텍스트 입력, 500자 제한, 실시간 글자 수 표시)
    - answer (텍스트 영역, 2000자 제한, 실시간 글자 수 표시)
    - keywords (태그 입력, 최대 20개, Enter로 추가)
    - categoryId (드롭다운, "전체 카테고리" 옵션 포함)
    - priority (숫자 입력, -100 ~ 100 슬라이더)
    - isActive (체크박스)
  - **검증**:
    - 필수 필드 미입력 시 제출 불가
    - 중복 질문 경고 (API 응답 기반)
    - 글자 수 초과 시 에러 메시지
  - **성공 동작**:
    - 목록 페이지로 리다이렉트 (`/admin/templates`)
    - 성공 토스트 메시지 표시
  - **에러 처리**:
    - 400(검증 오류): 필드별 에러 메시지 표시
    - 403(권한 없음): 에러 페이지 또는 로그인 리다이렉트
    - 409(중복 질문): question 필드에 에러 메시지 표시
- **검증 기준**:
  - 폼 제출 시 API 호출 성공
  - 검증 에러 메시지 표시 확인
  - 성공 후 리다이렉트 및 토스트 메시지 확인
  - 중복 질문 에러 처리 확인

#### Task 3-4: 템플릿 미리보기 (선택, Could)
- **작업 내용** (requirements.md FR-3.3 기준):
  - 폼 우측에 실시간 미리보기 패널
  - answer 필드 입력 시 실시간 렌더링
  - Markdown 지원 (선택)
- **검증 기준**:
  - 미리보기 실시간 업데이트
- **우선순위**: Could (시간 부족 시 생략 가능)

**Phase 3 완료 기준**:
- [ ] 템플릿 목록 페이지 정상 동작 (조회, 필터링, 검색, 페이지네이션)
- [ ] 템플릿 생성 폼 정상 동작 (검증, 제출, 에러 처리)
- [ ] 템플릿 수정 폼 정상 동작 (기존 데이터 로드, 수정 제출)
- [ ] 템플릿 삭제 기능 정상 동작 (확인 모달, Soft Delete)
- [ ] 관리자 권한 검증 (비관리자 접근 시 에러)
- [ ] 모바일 UI 대응 (데스크톱 우선, 모바일은 선택)

**Phase 3 산출물**:
- frontend/src/lib/api/templates.ts
- frontend/src/app/admin/templates/page.tsx
- frontend/src/app/admin/templates/new/page.tsx
- frontend/src/app/admin/templates/[id]/edit/page.tsx
- frontend/src/components/admin/TemplateList.tsx
- frontend/src/components/admin/TemplateForm.tsx
- docs/components/admin/TemplateList.md (선택, frontend-dev 작성)
- docs/components/admin/TemplateForm.md (선택, frontend-dev 작성)

---

### Phase 4: 테스트 및 검증

**담당**: test-runner
**예상 소요 시간**: 2~3시간
**목표**: E2E 테스트 작성 + 전체 기능 검증

#### Task 4-1: API 통합 테스트 작성
- **생성 파일**:
  - `backend/src/__tests__/routes/template.routes.test.ts`
- **테스트 케이스** (design.md 12.2절 기준):
  - POST /api/templates: 관리자 권한 검증
  - POST /api/templates: 중복 질문 409 에러
  - POST /api/templates: keywords 개수 제한 (최대 20개)
  - GET /api/templates: 페이지네이션 동작 확인
  - GET /api/templates: 카테고리 필터링 확인
  - PUT /api/templates/:id: 템플릿 수정 후 캐시 무효화
  - DELETE /api/templates/:id: Soft Delete 확인
- **검증 기준**:
  - 7개 이상 API 통합 테스트 통과

#### Task 4-2: E2E 테스트 작성 (ChatService 통합)
- **생성 파일**:
  - `backend/src/__tests__/e2e/template-matching.test.ts`
- **테스트 시나리오** (design.md 12.3절 기준):
  1. 템플릿 등록 → 사용자 메시지 전송 → 템플릿 답변 반환 확인
  2. 템플릿 미매칭 → AI 폴백 확인
  3. 템플릿 비활성화(isActive=false) → AI 폴백 확인
  4. message.metadata에 템플릿 정보 기록 확인
  5. 카테고리 일치 시 우선 매칭 확인
- **검증 기준**:
  - 5개 E2E 시나리오 통과

#### Task 4-3: 프론트엔드 E2E 테스트 (Playwright)
- **생성 파일**:
  - `frontend/tests/admin/templates.spec.ts`
- **테스트 시나리오**:
  1. 관리자 로그인 → 템플릿 목록 페이지 접근
  2. "새 템플릿 추가" 버튼 클릭 → 폼 입력 → 제출 → 목록에서 확인
  3. 템플릿 수정 버튼 클릭 → 기존 데이터 로드 확인 → 수정 → 저장
  4. 템플릿 삭제 버튼 클릭 → 확인 모달 → 삭제 → 목록에서 사라짐 확인
  5. 검색 및 필터링 동작 확인
- **검증 기준**:
  - 5개 Playwright 테스트 통과

#### Task 4-4: 성능 테스트
- **테스트 내용**:
  - 템플릿 매칭 시간 측정 (목표: 50ms 이내)
  - 템플릿 조회 시간 측정 (목표: 100ms 이내)
  - 템플릿 1,000개 환경에서 성능 저하 없음 확인
- **검증 기준**:
  - 50ms 이내 매칭 완료 (100개 템플릿 기준)
  - 캐시 히트 시 10ms 이내
  - 1,000개 템플릿 환경에서도 50ms 이내

#### Task 4-5: 보안 테스트
- **테스트 내용** (design.md 10절 기준):
  - XSS 공격 시도 (템플릿 answer 필드에 `<script>` 삽입)
  - 비관리자 API 접근 시도 (403 에러 확인)
  - Rate Limiting 동작 확인 (분당 30회 제한)
  - SQL Injection 시도 (Prisma ORM 방어 확인)
- **검증 기준**:
  - XSS 공격 차단 (sanitize 동작)
  - 비관리자 403 에러
  - Rate Limiting 작동
  - SQL Injection 무효화

**Phase 4 완료 기준**:
- [ ] API 통합 테스트 7개 이상 통과
- [ ] E2E 테스트 5개 이상 통과
- [ ] Playwright 테스트 5개 이상 통과
- [ ] 성능 목표 달성 (매칭 50ms, 조회 100ms)
- [ ] 보안 테스트 통과 (XSS, 권한, Rate Limiting)

**Phase 4 산출물**:
- backend/src/__tests__/routes/template.routes.test.ts
- backend/src/__tests__/e2e/template-matching.test.ts
- frontend/tests/admin/templates.spec.ts

---

### Phase 5: 문서화 및 마무리

**담당**: code-reviewer (검증) + doc-writer (문서화)
**예상 소요 시간**: 1~2시간
**목표**: 코드/문서 리뷰 + 운영 문서 작성

#### Task 5-1: 코드 리뷰 (code-reviewer)
- **검토 항목**:
  - 설계서(design.md) ↔ 구현 일치 확인
    - API 스펙 일치 (엔드포인트, 요청/응답 형식)
    - DB 스키마 일치 (컬럼, 인덱스, 관계)
    - 매칭 알고리즘 일치 (점수 계산 공식)
  - 기술 문서(docs/api/) ↔ 코드 일치 확인
  - 코딩 컨벤션 준수 (한국어 주석, 영어 변수명, 2스페이스)
  - 에러 처리 완성도
  - 보안 이슈 (XSS, SQL Injection, 권한 검증)
  - 성능 최적화 (캐시, 인덱스 활용)
- **검증 기준**:
  - Critical 이슈 0건
  - 설계 대비 변경사항 문서화 (design.md에 "변경 이력" 추가)

#### Task 5-2: API 스펙 문서 검증 (code-reviewer)
- **검증 파일**:
  - `docs/api/faq-template-management.md` (backend-dev가 Phase 1에서 작성)
- **검증 항목**:
  - 실제 API 응답과 문서 일치
  - 에러 케이스 누락 없음
  - F-03 통합 내용 반영 (Phase 2)
- **검증 기준**:
  - 문서↔코드 불일치 0건

#### Task 5-3: 운영 문서 작성 (doc-writer)
- **생성 파일**:
  - `docs/dev-log.md` (업데이트)
  - `CHANGELOG.md` (업데이트)
  - `README.md` (필요 시 업데이트)
- **작업 내용**:
  - dev-log.md에 F-07 개발 진행 로그 추가
    - Phase별 작업 내용
    - 의존성 확인 (F-01, F-02, F-03)
    - 발견된 이슈 및 해결 방법
  - CHANGELOG.md에 F-07 변경사항 추가
    - 새 기능: 템플릿 CRUD API, 템플릿 매칭 로직
    - 수정 사항: chat.service.ts 수정 (F-03 통합)
    - DB 스키마: faq_template 테이블 추가
  - README.md 업데이트 (필요 시)
    - "주요 기능" 섹션에 "답변 템플릿 관리" 추가
    - 환경변수 추가 없음 (기존 DATABASE_URL 활용)
- **검증 기준**:
  - 문서 작성 완료
  - 누락된 기술/설계 문서 없음 (발견 시 보고만)

#### Task 5-4: 기능 완료 처리
- **작업 내용**:
  - `docs/project/features.md`에서 F-07 상태를 "완료"로 변경
  - Git 커밋: `feat(F-07): 답변 템플릿 관리 기능 구현`
  - Git 커밋: `docs(F-07): 운영 문서 작성`
  - Git 커밋: `test(F-07): 테스트 작성`
- **검증 기준**:
  - 커밋 메시지 컨벤션 준수 (Conventional Commits)
  - 커밋 분리 기준 준수 (구현/문서/테스트 별도 커밋)

**Phase 5 완료 기준**:
- [ ] 코드 리뷰 통과 (Critical 이슈 0건)
- [ ] API 스펙 문서↔코드 일치 확인
- [ ] 운영 문서(dev-log.md, CHANGELOG.md) 작성 완료
- [ ] features.md에 F-07 완료 처리
- [ ] Git 커밋 3개 완료 (구현, 문서, 테스트)

**Phase 5 산출물**:
- docs/dev-log.md (업데이트)
- CHANGELOG.md (업데이트)
- docs/project/features.md (상태 업데이트)

---

## 4. 태스크 의존성 다이어그램

```
Phase 1: 백엔드 기반 구축
├─ Task 1-1: DB 스키마 및 마이그레이션
├─ Task 1-2: 타입 정의
├─ Task 1-3: 입력 검증 스키마
├─ Task 1-4: 관리자 권한 미들웨어
│    └─ (병렬 가능: Task 1-2, 1-3과 동시 진행)
├─ Task 1-5: TemplateService 구현
│    └─ (의존: Task 1-1, 1-2 완료 필요)
├─ Task 1-6: TemplateController 및 라우트
│    └─ (의존: Task 1-3, 1-4, 1-5 완료 필요)
└─ Task 1-7: 유닛 테스트
     └─ (의존: Task 1-5 완료 필요)

Phase 2: F-03 통합
├─ Task 2-1: ChatService 수정
│    └─ (의존: Phase 1 완료 필요)
└─ Task 2-2: 통합 테스트
     └─ (의존: Task 2-1 완료 필요)

Phase 3: 프론트엔드 구현
├─ Task 3-1: API 클라이언트 함수
│    └─ (의존: Phase 1 완료 필요, API 스펙 확정)
├─ Task 3-2: 템플릿 목록 페이지
│    └─ (의존: Task 3-1 완료 필요)
├─ Task 3-3: 템플릿 생성/수정 폼
│    └─ (의존: Task 3-1 완료 필요)
└─ Task 3-4: 템플릿 미리보기 (선택)
     └─ (의존: Task 3-3 완료 필요)

Phase 4: 테스트 및 검증
├─ Task 4-1: API 통합 테스트
│    └─ (의존: Phase 1 완료 필요)
├─ Task 4-2: E2E 테스트 (ChatService)
│    └─ (의존: Phase 2 완료 필요)
├─ Task 4-3: 프론트엔드 E2E 테스트
│    └─ (의존: Phase 3 완료 필요)
├─ Task 4-4: 성능 테스트
│    └─ (의존: Phase 1, 2 완료 필요)
└─ Task 4-5: 보안 테스트
     └─ (의존: Phase 1, 2, 3 완료 필요)

Phase 5: 문서화 및 마무리
├─ Task 5-1: 코드 리뷰
│    └─ (의존: Phase 1, 2, 3 완료 필요)
├─ Task 5-2: API 스펙 문서 검증
│    └─ (의존: Phase 1 완료 필요)
├─ Task 5-3: 운영 문서 작성
│    └─ (의존: Phase 4 완료 필요)
└─ Task 5-4: 기능 완료 처리
     └─ (의존: Task 5-1, 5-2, 5-3 완료 필요)
```

**병렬 실행 가능 구간**:
- Phase 1 내부: Task 1-2, 1-3, 1-4는 병렬 가능
- Phase 4 내부: Task 4-1, 4-4, 4-5는 부분 병렬 가능 (Phase 2 완료 후)
- **단, 전체 파이프라인은 순차 실행 권장** (의존성 강함)

---

## 5. 예상 리스크 및 대응 방안

| 리스크 | 영향도 | 발생 가능성 | 대응 방안 |
|--------|--------|-----------|-----------|
| **R-1: F-03 통합 시 기존 로직 충돌** | High | Medium | - Phase 2 전에 chat.service.ts 코드 리뷰 완료<br>- 통합 테스트 작성하여 기존 AI 폴백 동작 검증<br>- 에스컬레이션 로직 유지 확인 |
| **R-2: 템플릿 매칭 성능 목표 미달** | High | Low | - Phase 1에서 캐시 전략 확실히 구현 (메모리 캐시)<br>- Phase 4 성능 테스트에서 조기 발견<br>- 필요 시 인덱스 추가 또는 알고리즘 최적화 |
| **R-3: 중복 질문 검증 실패** | Medium | Low | - UNIQUE 인덱스를 DB 레벨에서 강제<br>- Prisma에서 중복 체크 로직 추가<br>- API 통합 테스트에서 409 에러 검증 |
| **R-4: 프론트엔드 폼 UX 복잡도** | Medium | Medium | - keywords 태그 입력은 react-select 또는 유사 라이브러리 활용<br>- 실시간 글자 수 표시로 사용자 피드백 제공<br>- 미리보기 기능은 Could 우선순위 (시간 부족 시 생략) |
| **R-5: 관리자 권한 검증 누락** | High | Low | - requireAdmin 미들웨어를 모든 템플릿 라우트에 적용<br>- Phase 4 보안 테스트에서 비관리자 접근 검증 |
| **R-6: 캐시 무효화 타이밍 이슈** | Medium | Low | - 템플릿 생성/수정/삭제 시 즉시 invalidateCache() 호출<br>- Phase 4 통합 테스트에서 캐시 무효화 검증 |
| **R-7: API 스펙 변경으로 프론트 재작업** | High | Low | - Phase 1에서 API 스펙을 완전히 확정 후 Phase 3 시작<br>- design.md의 API 스펙을 엄격히 준수<br>- Phase 1 완료 후 API 문서 작성 및 리뷰 |
| **R-8: 테스트 작성 시간 부족** | Medium | Medium | - 유닛 테스트를 Phase 1에서 동시 작성 (TDD)<br>- E2E 테스트는 핵심 시나리오만 우선 작성 (5개)<br>- 필요 시 Phase 4 시간 추가 확보 |

**대응 우선순위**:
1. **R-1 (F-03 통합 충돌)**: Phase 2 전에 chat.service.ts 리뷰 필수
2. **R-7 (API 스펙 변경)**: Phase 1 완료 후 API 문서 리뷰 필수
3. **R-5 (권한 검증 누락)**: Phase 1에서 requireAdmin 미들웨어 확실히 구현

---

## 6. 검증 체크리스트

### 6.1 기능 검증
- [ ] **FR-1.1**: 템플릿 생성 API 정상 동작 (POST /api/templates)
- [ ] **FR-1.2**: 템플릿 조회 API 정상 동작 (GET /api/templates, 필터링, 페이지네이션)
- [ ] **FR-1.3**: 템플릿 수정 API 정상 동작 (PUT /api/templates/:id)
- [ ] **FR-1.4**: 템플릿 삭제 API 정상 동작 (DELETE /api/templates/:id, Soft Delete)
- [ ] **FR-2.1**: 키워드 기반 매칭 정상 동작 (점수 계산, 임계값 필터링)
- [ ] **FR-2.2**: 매칭 결과 로깅 (message.metadata에 템플릿 정보 기록)
- [ ] **FR-2.3**: 폴백 전략 정상 동작 (매칭 실패 시 OpenAI API 호출)
- [ ] **FR-3.1**: 템플릿 목록 화면 정상 동작 (조회, 필터링, 검색, 페이지네이션)
- [ ] **FR-3.2**: 템플릿 생성/수정 폼 정상 동작 (검증, 제출, 에러 처리)

### 6.2 비기능 검증
- [ ] **NFR-1 (보안)**: 관리자 권한 검증 동작 확인
- [ ] **NFR-1 (보안)**: XSS 공격 차단 (템플릿 answer sanitize)
- [ ] **NFR-1 (보안)**: Rate Limiting 동작 확인 (분당 30회)
- [ ] **NFR-2 (성능)**: 템플릿 매칭 50ms 이내 완료 (100개 기준)
- [ ] **NFR-2 (성능)**: 템플릿 조회 100ms 이내 응답
- [ ] **NFR-2 (성능)**: 1,000개 템플릿 환경에서 성능 저하 없음
- [ ] **NFR-4 (가용성)**: 템플릿 조회 실패 시 AI 폴백 정상 동작
- [ ] **NFR-5 (유지보수성)**: TemplateService 분리 (ChatService와 독립)

### 6.3 문서 검증
- [ ] **API 스펙 문서**: docs/api/faq-template-management.md 작성 및 코드 일치
- [ ] **DB 스키마 문서**: docs/db/faq-template.md 작성 (선택)
- [ ] **설계 대비 변경사항**: design.md에 "변경 이력" 추가 (변경 시)
- [ ] **운영 문서**: docs/dev-log.md 업데이트
- [ ] **CHANGELOG**: CHANGELOG.md 업데이트

### 6.4 테스트 검증
- [ ] **유닛 테스트**: 9개 이상 통과 (TemplateService)
- [ ] **API 통합 테스트**: 7개 이상 통과 (template.routes.test.ts)
- [ ] **E2E 테스트**: 5개 이상 통과 (ChatService 통합)
- [ ] **Playwright 테스트**: 5개 이상 통과 (관리자 페이지)
- [ ] **성능 테스트**: 통과 (매칭 50ms, 조회 100ms)
- [ ] **보안 테스트**: 통과 (XSS, 권한, Rate Limiting)

---

## 7. 완료 기준 (Definition of Done)

### 필수 (Must-Have)
- [ ] 템플릿 CRUD API 4개 엔드포인트 정상 동작
- [ ] 템플릿 매칭 로직 정상 동작 (점수 계산, 임계값 필터링)
- [ ] F-03 통합 완료 (ChatService에 템플릿 매칭 추가)
- [ ] 템플릿 매칭 성공 시 AI 호출 생략 (1초 이내 응답)
- [ ] 템플릿 매칭 실패 시 AI 폴백 정상 동작
- [ ] 관리자 템플릿 목록 페이지 정상 동작
- [ ] 관리자 템플릿 생성/수정 폼 정상 동작
- [ ] 중복 질문 등록 방지 (409 에러 반환)
- [ ] Soft Delete 정상 동작
- [ ] 유닛 테스트 9개 이상 통과
- [ ] API 통합 테스트 7개 이상 통과
- [ ] E2E 테스트 5개 이상 통과
- [ ] API 스펙 문서 작성 (docs/api/faq-template-management.md)
- [ ] 운영 문서 작성 (docs/dev-log.md, CHANGELOG.md)

### 권장 (Should-Have)
- [ ] message.metadata에 템플릿 매칭 정보 로깅
- [ ] 카테고리별 템플릿 필터링
- [ ] Playwright 테스트 5개 이상 통과
- [ ] 성능 목표 달성 (매칭 50ms, 조회 100ms)

### 선택 (Could-Have)
- [ ] 템플릿 미리보기 기능 (폼 우측 패널)
- [ ] 템플릿 사용 통계 (usageCount, lastUsedAt)
- [ ] 미매칭 질문 로그 수집

---

## 8. 예상 타임라인

| Phase | 예상 소요 시간 | 누적 시간 |
|-------|--------------|----------|
| Phase 1: 백엔드 기반 구축 | 2~3시간 | 2~3시간 |
| Phase 2: F-03 통합 | 1~2시간 | 3~5시간 |
| Phase 3: 프론트엔드 구현 | 3~4시간 | 6~9시간 |
| Phase 4: 테스트 및 검증 | 2~3시간 | 8~12시간 |
| Phase 5: 문서화 및 마무리 | 1~2시간 | 9~14시간 |

**총 예상 시간**: **9~14시간** (1.5~2 작업일)

**시간 절약 전략**:
- Phase 1에서 TDD 적용 (유닛 테스트 동시 작성)
- Phase 3에서 Could 기능(미리보기) 생략 가능
- Phase 4에서 핵심 시나리오 우선 테스트

---

## 9. 다음 단계

1. **즉시 실행**: `/fullstack-feature` 명령어로 F-07 개발 시작 (순차 파이프라인)
2. **Phase 1 완료 후**: API 스펙 문서 작성 및 리뷰 (backend-dev)
3. **Phase 2 완료 후**: F-03 통합 검증 (chat.service.ts 리뷰)
4. **Phase 3 완료 후**: 프론트엔드 E2E 테스트 실행
5. **Phase 5 완료 후**: features.md에서 F-07 완료 처리 + 커밋

---

## 10. 변경 이력

| 날짜 | 변경 내용 | 변경자 |
|------|-----------|--------|
| 2026-02-12 | 초안 작성 (requirements.md, design.md 기반) | product-manager |
