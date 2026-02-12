# 다국어 지원 (F-10) — 구현 계획서

## 1. 참조 문서
- **요구사항 분석서**: `docs/specs/multilingual-support/requirements.md`
- **기술 설계서**: `docs/specs/multilingual-support/design.md`
- **기능 백로그**: `docs/project/features.md`

---

## 2. 구현 Phase

### Phase 1: 기반 작업 (DB + 라이브러리 + 타입 정의)
> 모든 후속 작업의 기반이 되는 인프라 구축

#### 복잡도: M (Medium)

- [ ] **Task 1-1**: 라이브러리 설치 → backend-dev
  - **설명**: franc 언어 감지 라이브러리 설치
  - **산출물**:
    - `backend/package.json` — `franc` 추가
  - **인수 기준**:
    - `npm install franc` 성공
    - `package.json`에 `franc` 의존성 추가됨
  - **예상 시간**: 5분

- [ ] **Task 1-2**: Prisma Enum 및 스키마 수정 → backend-dev
  - **설명**: Language Enum 추가, conversation/category/faq_template 테이블 수정
  - **산출물**:
    - `backend/prisma/schema.prisma` — Language enum, conversation.language, category.name_ko/name_en, faq_template.language 추가
  - **인수 기준**:
    - Language enum 정의 ('ko', 'en')
    - conversation.language 컬럼 추가 (기본값 'ko')
    - category.name_ko, name_en 컬럼 추가
    - faq_template.language 컬럼 추가 (기본값 'ko')
    - 인덱스 정의: idx_conversation_language, idx_conversation_language_analytics, idx_template_language_active 등
  - **예상 시간**: 15분

- [ ] **Task 1-3**: DB 마이그레이션 생성 및 실행 → backend-dev
  - **설명**: Prisma 마이그레이션 생성 및 DB 적용
  - **산출물**:
    - `backend/prisma/migrations/[timestamp]_add_multilingual_support/migration.sql`
  - **인수 기준**:
    - 마이그레이션 파일 생성 완료
    - DB 적용 성공 (no errors)
    - 기존 데이터 유지 (conversation.language = 'ko' 기본값 설정)
  - **예상 시간**: 10분

- [ ] **Task 1-4**: 카테고리 영어 번역 시드 데이터 삽입 → backend-dev
  - **설명**: 기존 5개 카테고리에 name_en 데이터 추가
  - **산출물**:
    - `backend/prisma/seed.ts` 수정 또는 별도 migration
  - **인수 기준**:
    - 상품문의 → Product Inquiry
    - 배송문의 → Shipping Inquiry
    - 반품/교환 → Return/Exchange
    - 결제문의 → Payment Inquiry
    - 기타 → Other
  - **예상 시간**: 10분

- [ ] **Task 1-5**: 타입 정의 추가 → backend-dev
  - **설명**: Language 타입, API 요청/응답 타입 업데이트
  - **산출물**:
    - `backend/src/types/conversation.types.ts` — language 필드 추가
    - `backend/src/types/chat.types.ts` — ChatResponse에 language 추가
  - **인수 기준**:
    - 타입스크립트 컴파일 오류 없음
    - language 필드가 'ko' | 'en' union type으로 정의됨
  - **예상 시간**: 10분

**Phase 1 완료 기준**:
- DB 스키마 변경 완료 (마이그레이션 적용)
- 카테고리 영어 번역 데이터 삽입
- 타입 정의 업데이트
- npm install 성공

**의존성**: 없음 (시작점)

---

### Phase 2: 백엔드 핵심 로직 (언어 감지 + 프롬프트 + OpenAI)
> Phase 1 완료 후 시작 가능. **순차 실행 필수** (openai.service.ts 충돌 방지)

#### 복잡도: L (Large)

- [ ] **Task 2-1**: 언어 감지 로직 구현 → backend-dev
  - **설명**: franc 라이브러리 래핑, detectLanguage() 함수 구현
  - **산출물**:
    - `backend/src/lib/language-detector.ts` — detectLanguage() 함수, SupportedLanguage 타입
  - **인수 기준**:
    - 한국어 메시지 입력 → language: 'ko' 반환
    - 영어 메시지 입력 → language: 'en' 반환
    - 짧은 메시지(5자 미만) → 폴백 언어 'ko' 반환
    - 신뢰도 임계값(0.5) 미만 시 폴백
  - **예상 시간**: 30분

- [ ] **Task 2-2**: 언어별 시스템 프롬프트 정의 → backend-dev
  - **설명**: 한국어/영어 프롬프트 객체 생성 (분류, 답변, 에스컬레이션, 폴백)
  - **산출물**:
    - `backend/src/lib/prompts.ts` — prompts 객체 (ko/en), SystemPrompt 인터페이스
  - **인수 기준**:
    - prompts.ko.classification, answer, escalation, fallback 정의
    - prompts.en.classification, answer, escalation, fallback 정의
    - 한국어는 존댓말 톤, 영어는 친근한 you 톤
  - **예상 시간**: 40분

- [ ] **Task 2-3**: 백엔드 시스템 메시지 다국어 리소스 → backend-dev
  - **설명**: 에스컬레이션, 에러 메시지 등 다국어 버전
  - **산출물**:
    - `backend/src/lib/i18n-messages.ts` — messages 객체 (ko/en)
  - **인수 기준**:
    - 에스컬레이션 메시지 한국어/영어
    - API 오류 메시지 한국어/영어
    - 폴백 메시지 한국어/영어
  - **예상 시간**: 20분

- [ ] **Task 2-4**: openai.service.ts 수정 (language 파라미터 추가) → backend-dev
  - **설명**: generateAnswer() 함수에 language 파라미터 추가 (기본값 'ko'), 프롬프트 선택 로직
  - **산출물**:
    - `backend/src/services/openai.service.ts` 수정
  - **인수 기준**:
    - generateAnswer() 시그니처에 language 파라미터 추가 (기본값 'ko')
    - 언어별 시스템 프롬프트 선택 (prompts[language].answer)
    - 에스컬레이션 키워드 감지도 언어별 분리
    - 기존 호출 (language 파라미터 없음) 정상 작동 (기본값 'ko')
  - **예상 시간**: 30분

- [ ] **Task 2-5**: chat.service.ts 수정 (언어 감지 로직 추가) → backend-dev
  - **설명**: processMessage() 함수에 언어 감지 로직 추가, generateAnswer() 호출 시 language 전달
  - **산출물**:
    - `backend/src/services/chat.service.ts` 수정
  - **인수 기준**:
    - 신규 대화 시 detectLanguage() 호출
    - conversation.language 저장
    - 기존 대화 시 conversation.language 조회 (재감지 안 함)
    - generateAnswer() 호출 시 language 파라미터 전달
    - 응답에 language 필드 포함
  - **예상 시간**: 40분

- [ ] **Task 2-6**: conversation.service.ts 수정 (언어 변경 API) → backend-dev
  - **설명**: updateLanguage() 함수 추가, 대화 조회 시 language 필드 포함
  - **산출물**:
    - `backend/src/services/conversation.service.ts` 수정
  - **인수 기준**:
    - updateLanguage() 함수 구현 (권한 검증 포함)
    - getConversation() 응답에 language 필드 포함
    - listConversations() 응답에 language 필드 포함
  - **예상 시간**: 30분

- [ ] **Task 2-7**: 언어 파라미터 검증 → backend-dev
  - **설명**: language 파라미터를 검증하는 Joi/Zod 스키마
  - **산출물**:
    - `backend/src/validators/language.validators.ts` — languageValidator
  - **인수 기준**:
    - 'ko' 또는 'en'만 허용
    - 다른 값 입력 시 400 에러
  - **예상 시간**: 15분

- [ ] **Task 2-8**: 대화 언어 변경 API 엔드포인트 추가 → backend-dev
  - **설명**: PATCH /api/conversations/:id/language 라우트 추가
  - **산출물**:
    - `backend/src/routes/conversation.routes.ts` 수정
  - **인수 기준**:
    - PATCH /api/conversations/:id/language 엔드포인트 작동
    - 요청 본문 { language: 'en' } 검증
    - 권한 검증 (requireAuth 미들웨어)
    - 응답에 변경된 language 포함
  - **예상 시간**: 20분

- [ ] **Task 2-9**: 카테고리 조회 API 수정 (언어별 이름 반환) → backend-dev
  - **설명**: GET /api/categories?language=en 쿼리 파라미터 추가
  - **산출물**:
    - `backend/src/routes/category.routes.ts` 수정
  - **인수 기준**:
    - language='ko' → name_ko 반환
    - language='en' → name_en 반환
    - 기본값: 'ko'
  - **예상 시간**: 20분

- [ ] **Task 2-10**: 템플릿 매칭 시 language 필터 추가 (F-07 연계) → backend-dev
  - **설명**: matchTemplate() 함수에 language 파라미터 추가
  - **산출물**:
    - `backend/src/services/template.service.ts` 수정 (F-07 구현된 경우)
  - **인수 기준**:
    - 템플릿 매칭 쿼리에 language 조건 추가
    - 해당 언어 템플릿이 없으면 AI 답변 생성
  - **예상 시간**: 20분

**Phase 2 완료 기준**:
- 언어 감지 로직 작동 (한국어/영어 자동 감지)
- 언어별 시스템 프롬프트로 OpenAI 답변 생성
- 대화 언어 변경 API 정상 작동
- 카테고리 조회 시 언어별 이름 반환
- 하위 호환성 검증 (기존 한국어 기능 정상 작동)

**의존성**: Phase 1 완료 필수

---

### Phase 3: 프론트엔드 (i18n + UI)
> Phase 2 완료 후 시작 가능. Phase 2와 병렬 실행 **불가** (백엔드 API 의존)

#### 복잡도: M (Medium)

- [ ] **Task 3-1**: next-intl 라이브러리 설치 → frontend-dev
  - **설명**: next-intl 설치 및 설정 파일 생성
  - **산출물**:
    - `frontend/package.json` — next-intl 추가
    - `frontend/i18n.ts` — next-intl 설정
  - **인수 기준**:
    - npm install next-intl 성공
    - i18n.ts 설정 파일 작성 (locale 기반 메시지 로드)
  - **예상 시간**: 10분

- [ ] **Task 3-2**: 번역 리소스 작성 → frontend-dev
  - **설명**: 한국어/영어 번역 JSON 파일 작성
  - **산출물**:
    - `frontend/messages/ko.json` — 한국어 번역
    - `frontend/messages/en.json` — 영어 번역
  - **인수 기준**:
    - 채팅 입력 placeholder, 버튼 텍스트, 로딩 메시지, 에러 메시지 번역
    - 최소 10개 이상 키 정의
  - **예상 시간**: 30분

- [ ] **Task 3-3**: 언어 Context 및 Hook 구현 → frontend-dev
  - **설명**: 언어 상태 관리 Context, 언어 전환 커스텀 훅
  - **산출물**:
    - `frontend/contexts/LanguageContext.tsx` — LanguageProvider, LanguageContext
    - `frontend/hooks/useLanguage.ts` — useLanguage 훅
  - **인수 기준**:
    - 언어 상태 전역 관리 (Context API)
    - localStorage에 선택한 언어 저장
    - useLanguage() 훅으로 언어 상태 및 전환 함수 제공
  - **예상 시간**: 30분

- [ ] **Task 3-4**: 언어 토글 UI 구현 → frontend-dev
  - **설명**: 채팅 창에 언어 전환 버튼 추가
  - **산출물**:
    - `frontend/components/chat/LanguageToggle.tsx` — 언어 토글 버튼 컴포넌트
  - **인수 기준**:
    - 언어 토글 버튼 표시 (예: "🌐 KO | EN")
    - 클릭 시 언어 전환 (ko ↔ en)
    - UI 텍스트 즉시 변경
  - **예상 시간**: 30분

- [ ] **Task 3-5**: 대화 언어 변경 API 호출 함수 추가 → frontend-dev
  - **설명**: updateConversationLanguage() API 함수 추가
  - **산출물**:
    - `frontend/lib/chat-api.ts` 수정
  - **인수 기준**:
    - PATCH /api/conversations/:id/language API 호출 함수 구현
    - 에러 핸들링 (403, 404, 400)
  - **예상 시간**: 15분

- [ ] **Task 3-6**: ChatWindow 컴포넌트에 언어 토글 통합 → frontend-dev
  - **설명**: ChatWindow에 LanguageToggle 추가, 언어 변경 시 API 호출
  - **산출물**:
    - `frontend/components/chat/ChatWindow.tsx` 수정
  - **인수 기준**:
    - 언어 토글 버튼이 채팅 창 상단에 표시됨
    - 언어 변경 시 updateConversationLanguage() 호출
    - 이후 메시지 전송 시 변경된 언어로 답변 생성됨
  - **예상 시간**: 30분

- [ ] **Task 3-7**: 앱 레이아웃에 next-intl Provider 추가 → frontend-dev
  - **설명**: app/layout.tsx에 NextIntlClientProvider 래핑
  - **산출물**:
    - `frontend/app/layout.tsx` 수정
  - **인수 기준**:
    - NextIntlClientProvider로 전체 앱 래핑
    - 언어 상태가 전역으로 공유됨
  - **예상 시간**: 10분

- [ ] **Task 3-8**: 채팅 UI 텍스트 다국어화 → frontend-dev
  - **설명**: 채팅 입력창, 버튼 등의 하드코딩된 텍스트를 번역 키로 교체
  - **산출물**:
    - `frontend/components/chat/ChatWindow.tsx` 수정 (placeholder, 버튼 텍스트 등)
  - **인수 기준**:
    - 입력창 placeholder: "메시지를 입력하세요" → t('chat.inputPlaceholder')
    - 전송 버튼: "전송" → t('chat.sendButton')
    - 로딩 메시지: "답변 생성 중..." → t('chat.loadingMessage')
    - 언어 전환 시 UI 텍스트 즉시 변경됨
  - **예상 시간**: 30분

**Phase 3 완료 기준**:
- next-intl 설정 완료 (한국어/영어 번역 리소스)
- 언어 토글 버튼 작동 (UI 텍스트 즉시 변경)
- 대화 언어 수동 변경 API 호출 성공
- 채팅 UI 텍스트가 언어에 맞게 표시됨
- 브라우저 새로고침 시 선택한 언어 유지 (localStorage)

**의존성**: Phase 2 완료 필수 (백엔드 API 작동)

---

### Phase 4: 테스트 및 검증
> Phase 2, 3 완료 후 시작. **순차 실행 필수** (통합 테스트)

#### 복잡도: M (Medium)

- [ ] **Task 4-1**: 언어 감지 단위 테스트 → test-runner
  - **설명**: detectLanguage() 함수 테스트
  - **산출물**:
    - `backend/src/__tests__/lib/language-detector.test.ts`
  - **인수 기준**:
    - 한국어 메시지 → 'ko' 반환
    - 영어 메시지 → 'en' 반환
    - 짧은 메시지 → 폴백 'ko'
    - 신뢰도 낮은 메시지 → 폴백 'ko'
  - **예상 시간**: 20분

- [ ] **Task 4-2**: 언어별 답변 생성 통합 테스트 → test-runner
  - **설명**: chat.service.ts의 언어 감지 → 답변 생성 전체 플로우 테스트
  - **산출물**:
    - `backend/src/__tests__/integration/multilingual-chat.test.ts`
  - **인수 기준**:
    - 신규 대화 시 언어 자동 감지
    - 한국어 대화 → 한국어 답변 생성
    - 영어 대화 → 영어 답변 생성
    - 기존 대화 계속 시 언어 재감지 안 함
  - **예상 시간**: 40분

- [ ] **Task 4-3**: 언어 변경 API 테스트 → test-runner
  - **설명**: PATCH /api/conversations/:id/language 엔드포인트 테스트
  - **산출물**:
    - `backend/src/__tests__/routes/conversation.routes.test.ts` 업데이트
  - **인수 기준**:
    - 유효한 요청 → 200 + 변경된 언어 반환
    - 잘못된 language 값 → 400 에러
    - 권한 없는 사용자 → 403 에러
    - 존재하지 않는 대화 → 404 에러
  - **예상 시간**: 30분

- [ ] **Task 4-4**: 카테고리 다국어 조회 테스트 → test-runner
  - **설명**: GET /api/categories?language=en 테스트
  - **산출물**:
    - `backend/src/__tests__/routes/category.routes.test.ts` 업데이트
  - **인수 기준**:
    - language='ko' → 한국어 카테고리 이름 반환
    - language='en' → 영어 카테고리 이름 반환
    - 기본값 'ko' 작동
  - **예상 시간**: 20분

- [ ] **Task 4-5**: 하위 호환성 회귀 테스트 → test-runner
  - **설명**: 기존 한국어 전용 기능(F-02, F-03)이 정상 작동하는지 검증
  - **산출물**:
    - 기존 테스트 파일 재실행 (language 파라미터 없이)
  - **인수 기준**:
    - 기존 테스트 모두 통과 (no regression)
    - language 파라미터 없는 API 호출 → 'ko'로 작동
    - 기존 대화 데이터 정상 조회 (language: 'ko' 또는 NULL)
  - **예상 시간**: 30분

- [ ] **Task 4-6**: 프론트엔드 E2E 테스트 → test-runner
  - **설명**: Playwright로 언어 전환 시나리오 테스트
  - **산출물**:
    - `frontend/e2e/multilingual.spec.ts`
  - **인수 기준**:
    - 언어 토글 버튼 클릭 → UI 텍스트 변경 확인
    - 언어 변경 후 메시지 전송 → 변경된 언어로 답변 생성 확인
    - 브라우저 새로고침 시 선택한 언어 유지
  - **예상 시간**: 40분

**Phase 4 완료 기준**:
- 모든 단위 테스트 통과
- 통합 테스트 통과 (언어 감지 → 답변 생성)
- 회귀 테스트 통과 (기존 기능 정상 작동)
- E2E 테스트 통과 (언어 전환 UI)

**의존성**: Phase 2, 3 완료 필수

---

### Phase 5: 코드 리뷰 및 문서화
> Phase 4 완료 후 시작. 최종 검증 단계.

#### 복잡도: S (Small)

- [ ] **Task 5-1**: 코드 리뷰 → code-reviewer
  - **설명**: 설계 ↔ 구현 일치 확인, 하위 호환성 검증, 성능 영향 검토
  - **산출물**: 리뷰 코멘트 (승인 또는 수정 요청)
  - **인수 기준**:
    - openai.service.ts 하위 호환성 검증 (language 기본값 'ko')
    - 프롬프트 다국어화 품질 검토
    - 성능 영향 검토 (언어 감지 추가 지연시간)
  - **예상 시간**: 30분

- [ ] **Task 5-2**: API 스펙 확정본 작성 → backend-dev
  - **설명**: 다국어 지원 API 문서화
  - **산출물**:
    - `docs/api/multilingual-support.md`
  - **인수 기준**:
    - PATCH /api/conversations/:id/language API 문서화
    - GET /api/categories?language 파라미터 문서화
    - 응답에 language 필드 추가 문서화
  - **예상 시간**: 20분

- [ ] **Task 5-3**: DB 스키마 설계서 작성 → backend-dev
  - **설명**: 다국어 지원 DB 변경사항 문서화
  - **산출물**:
    - `docs/db/multilingual-support.md`
  - **인수 기준**:
    - Language Enum 문서화
    - conversation.language 컬럼 문서화
    - category.name_ko, name_en 컬럼 문서화
    - faq_template.language 컬럼 문서화
    - 인덱스 및 마이그레이션 전략 문서화
  - **예상 시간**: 20분

- [ ] **Task 5-4**: 진행 로그 및 CHANGELOG 업데이트 → doc-writer
  - **설명**: F-10 완료 내용 기록
  - **산출물**:
    - `docs/dev-log.md` 업데이트
    - `CHANGELOG.md` 업데이트
  - **인수 기준**:
    - F-10 완료 항목 추가 (한국어/영어 지원, 언어 자동 감지, 언어 전환 UI)
    - 주요 기술 결정 기록 (franc 라이브러리, 프롬프트 분리 전략)
  - **예상 시간**: 15분

**Phase 5 완료 기준**:
- 코드 리뷰 승인
- API 스펙 확정본 작성 완료
- DB 스키마 설계서 작성 완료
- 진행 로그 및 CHANGELOG 업데이트

**의존성**: Phase 4 완료 필수

---

## 3. 태스크 의존성 그래프

```
Phase 1 (기반 작업)
  Task 1-1 (라이브러리 설치) ──┐
  Task 1-2 (스키마 수정) ────────┼──▶ Task 1-3 (마이그레이션) ──▶ Task 1-4 (시드 데이터)
  Task 1-5 (타입 정의) ──────────┘

Phase 1 완료 ──────────────────▼

Phase 2 (백엔드 핵심 로직) — 순차 실행 필수 (openai.service.ts 충돌 방지)
  Task 2-1 (언어 감지) ──────────┐
  Task 2-2 (프롬프트 정의) ──────┼──▶ Task 2-4 (openai.service 수정)
  Task 2-3 (i18n 메시지) ────────┘          │
                                           ▼
                              Task 2-5 (chat.service 수정)
                                           │
                              Task 2-6 (conversation.service 수정)
                                           │
                              ┌────────────┴────────────┐
                Task 2-7 (검증)   Task 2-9 (카테고리 API)   Task 2-10 (템플릿 매칭)
                       │
                Task 2-8 (언어 변경 API)

Phase 2 완료 ──────────────────▼

Phase 3 (프론트엔드) — Phase 2 완료 후 시작
  Task 3-1 (라이브러리) ──▶ Task 3-2 (번역 리소스) ──┐
                                                   │
  Task 3-3 (언어 Context) ──▶ Task 3-4 (언어 토글) ──┤
                                                   │
  Task 3-5 (API 함수) ──────────────────────────────┼──▶ Task 3-6 (ChatWindow 통합)
                                                   │         │
  Task 3-7 (layout Provider) ──────────────────────┘         ▼
                                                   Task 3-8 (UI 다국어화)

Phase 2 + 3 완료 ──────────────▼

Phase 4 (테스트)
  Task 4-1 (언어 감지 테스트) ──┐
  Task 4-2 (통합 테스트) ────────┤
  Task 4-3 (언어 변경 API 테스트) ┼──▶ Task 4-5 (회귀 테스트)
  Task 4-4 (카테고리 테스트) ────┤
  Task 4-6 (E2E 테스트) ─────────┘

Phase 4 완료 ──────────────────▼

Phase 5 (리뷰 및 문서)
  Task 5-1 (코드 리뷰) ──────────┐
  Task 5-2 (API 문서) ───────────┼──▶ Task 5-4 (진행 로그)
  Task 5-3 (DB 문서) ────────────┘
```

---

## 4. 병렬 실행 판단

### 권장 실행 모드: **순차 실행 (서브에이전트 단독)**

### 근거

#### 1. 공유 모듈 충돌 위험 (Critical)
- **openai.service.ts**는 F-02 (분류), F-03 (답변)에서 이미 사용 중인 핵심 모듈
- Phase 2에서 이 파일을 수정해야 하므로 다른 작업과 병렬 실행 시 merge 충돌 발생 가능
- **해결 방안**: 순차 실행으로 충돌 원천 차단

#### 2. 백엔드 → 프론트엔드 의존성
- Phase 3 (프론트엔드)는 Phase 2 (백엔드 API) 완료 후에만 시작 가능
- 백엔드 API가 작동하지 않으면 프론트엔드 통합 테스트 불가
- **병렬 불가 근거**: Phase 2와 Phase 3은 의존성 체인으로 연결됨

#### 3. 테스트 의존성
- Phase 4 (테스트)는 Phase 2 + 3 완료 후에만 의미 있음
- 통합 테스트는 백엔드 + 프론트엔드 전체가 작동해야 검증 가능
- **병렬 불가 근거**: Phase 4는 Phase 2, 3에 의존

#### 4. 태스크 복잡도 분석
- Phase 2 (백엔드): 10개 태스크, 예상 시간 약 4시간 (openai.service 수정 포함)
- Phase 3 (프론트엔드): 8개 태스크, 예상 시간 약 2.5시간
- Phase 4 (테스트): 6개 태스크, 예상 시간 약 3시간

**총 예상 시간**: 약 10시간 (순차 실행)

#### 5. Agent Team 사용 시 예상 문제
- 백엔드 팀원과 프론트엔드 팀원이 동시 작업 시:
  - 백엔드 API가 완성되지 않아 프론트엔드가 대기해야 함 (병렬 효과 감소)
  - openai.service.ts 충돌 위험 (기존 F-02, F-03과도 충돌 가능)
  - worktree merge 시 통합 테스트 실패 가능성

### 병렬 가능한 태스크 (부분적)

Phase 1 내부에서는 다음 태스크가 병렬 가능:
- Task 1-1 (라이브러리 설치)
- Task 1-2 (스키마 수정)
- Task 1-5 (타입 정의)

**하지만**: Phase 1은 총 50분으로 짧아서 병렬 효과 미미 → 순차 권장

Phase 4 (테스트) 내부에서는 다음 테스크가 병렬 가능:
- Task 4-1 ~ 4-4 (각 단위 테스트)

**하지만**: 테스트는 통합 검증이 중요하므로 순차로 실행하여 문제 조기 발견 권장

### 최종 권장 사항

- **실행 모드**: `/fullstack-feature` (순차 파이프라인)
- **실행 순서**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
- **에이전트 호출**:
  1. `product-manager` (이 문서 작성 완료)
  2. `backend-dev` (Phase 1 + Phase 2 구현)
  3. `frontend-dev` (Phase 3 구현)
  4. `test-runner` (Phase 4 테스트)
  5. `code-reviewer` (Phase 5 리뷰)
  6. `doc-writer` (Phase 5 문서화)

---

## 5. 리스크 및 대응 방안

| 리스크 | 영향도 | 발생 확률 | 대응 방안 |
|--------|--------|----------|-----------|
| **openai.service.ts 수정 시 기존 기능 영향** | High | Medium | - 하위 호환성 검증 (language 기본값 'ko')<br>- 회귀 테스트 필수 (Phase 4-5)<br>- 기존 테스트 재실행 |
| **franc 라이브러리 정확도 낮음** | Medium | Low | - 짧은 메시지 폴백 전략 (5자 미만 → 'ko')<br>- 신뢰도 임계값 설정 (0.5)<br>- 사용자 수동 언어 변경 제공 (Phase 3) |
| **OpenAI 프롬프트 다국어 품질** | Medium | Medium | - 네이티브 스피커 검토 (초기에는 개발자 작성 허용)<br>- A/B 테스트로 점진적 개선<br>- 사용자 피드백 수집 (F-09 연계) |
| **Phase 2 지연으로 전체 일정 영향** | High | Low | - Phase 2를 최우선 작업으로 설정<br>- openai.service.ts 수정을 조기에 완료하여 리스크 조기 노출 |
| **번역 리소스 누락** | Low | Medium | - 최소 10개 키로 시작 (Phase 3-2)<br>- 누락 시 fallback locale 설정 (en → ko)<br>- next-intl의 타입 안전성 활용 (오타 방지) |
| **DB 마이그레이션 실패** | High | Low | - 마이그레이션 전 백업<br>- 개발 환경에서 먼저 테스트<br>- 기존 데이터에 기본값 설정 (language='ko') |
| **E2E 테스트 불안정** | Medium | Medium | - Playwright retry 설정 (최대 3회)<br>- 명시적 대기(wait) 사용<br>- 테스트 실패 시 스크린샷 캡처 |

---

## 6. 검증 계획

### 단위 테스트 범위

#### Backend
- **언어 감지**: detectLanguage() 함수
  - 한국어 메시지 감지 (예: "배송은 얼마나 걸리나요?")
  - 영어 메시지 감지 (예: "How long does shipping take?")
  - 짧은 메시지 폴백 (예: "hi", "ㅎㅇ")
  - 신뢰도 낮은 메시지 폴백
- **프롬프트 선택**: openai.service.ts
  - language='ko' → 한국어 시스템 프롬프트 사용
  - language='en' → 영어 시스템 프롬프트 사용
  - 에스컬레이션 키워드 감지 (언어별)
- **API 엔드포인트**: conversation.routes.ts
  - PATCH /api/conversations/:id/language 검증 (400, 403, 404, 200)

#### Frontend
- **언어 Context**: LanguageContext.tsx
  - 언어 상태 변경 시 localStorage 저장
  - useLanguage 훅으로 언어 상태 조회
- **번역 리소스**: messages/ko.json, en.json
  - 누락된 키 없음 확인 (타입 안전성)

### 통합 테스트 시나리오

1. **신규 대화 시작 (한국어)**
   - POST /api/chat { message: "배송 기간은?" }
   - 응답에 language: 'ko' 포함 확인
   - 한국어 답변 생성 확인

2. **신규 대화 시작 (영어)**
   - POST /api/chat { message: "Shipping time?" }
   - 응답에 language: 'en' 포함 확인
   - 영어 답변 생성 확인

3. **기존 대화 계속 (언어 재감지 안 함)**
   - 영어 대화 세션에서 한국어 메시지 전송
   - 답변은 여전히 영어로 생성됨 (첫 언어 유지)

4. **언어 수동 변경**
   - PATCH /api/conversations/:id/language { language: 'en' }
   - 다음 메시지 전송 시 영어 답변 생성 확인

5. **카테고리 다국어 조회**
   - GET /api/categories?language=en
   - 카테고리 이름이 영어로 반환됨 (Product Inquiry, Shipping Inquiry 등)

### E2E 테스트 시나리오

1. **언어 토글 버튼 작동**
   - 채팅 창 열기 → 언어 토글 버튼 클릭 (KO → EN)
   - UI 텍스트 변경 확인 ("메시지를 입력하세요" → "Enter your message")

2. **언어 변경 후 새 메시지 전송**
   - 언어를 영어로 변경
   - 메시지 전송: "How long does shipping take?"
   - 영어 답변 수신 확인

3. **브라우저 새로고침 시 언어 유지**
   - 언어를 영어로 변경
   - 브라우저 새로고침
   - 여전히 영어 UI 표시됨 (localStorage 확인)

### 하위 호환성 확인 방법

1. **기존 테스트 재실행**
   - F-02 (분류) 테스트 실행 → 모두 통과 확인
   - F-03 (답변) 테스트 실행 → 모두 통과 확인

2. **language 파라미터 없는 API 호출**
   - POST /api/chat { message: "배송은?" } (language 없음)
   - 응답에 language: 'ko' 포함 확인 (기본값)
   - 한국어 답변 생성 확인

3. **기존 대화 데이터 조회**
   - 기존 대화 조회 (language: NULL 또는 'ko')
   - 정상 조회 확인 (에러 없음)

---

## 7. 예상 산출물

### 백엔드 (Phase 1 + Phase 2)
- `backend/prisma/schema.prisma` (수정)
- `backend/prisma/migrations/[timestamp]_add_multilingual_support/migration.sql` (신규)
- `backend/prisma/seed.ts` (수정 또는 별도 migration)
- `backend/src/lib/language-detector.ts` (신규)
- `backend/src/lib/prompts.ts` (신규)
- `backend/src/lib/i18n-messages.ts` (신규)
- `backend/src/services/openai.service.ts` (수정)
- `backend/src/services/chat.service.ts` (수정)
- `backend/src/services/conversation.service.ts` (수정)
- `backend/src/services/template.service.ts` (수정, F-07 있는 경우)
- `backend/src/validators/language.validators.ts` (신규)
- `backend/src/routes/conversation.routes.ts` (수정)
- `backend/src/routes/category.routes.ts` (수정)
- `backend/src/types/conversation.types.ts` (수정)
- `backend/src/types/chat.types.ts` (수정)

### 프론트엔드 (Phase 3)
- `frontend/i18n.ts` (신규)
- `frontend/messages/ko.json` (신규)
- `frontend/messages/en.json` (신규)
- `frontend/contexts/LanguageContext.tsx` (신규)
- `frontend/hooks/useLanguage.ts` (신규)
- `frontend/components/chat/LanguageToggle.tsx` (신규)
- `frontend/components/chat/ChatWindow.tsx` (수정)
- `frontend/lib/chat-api.ts` (수정)
- `frontend/app/layout.tsx` (수정)

### 테스트 (Phase 4)
- `backend/src/__tests__/lib/language-detector.test.ts` (신규)
- `backend/src/__tests__/integration/multilingual-chat.test.ts` (신규)
- `backend/src/__tests__/routes/conversation.routes.test.ts` (수정)
- `backend/src/__tests__/routes/category.routes.test.ts` (수정)
- `frontend/e2e/multilingual.spec.ts` (신규)

### 문서 (Phase 5)
- `docs/api/multilingual-support.md` (신규)
- `docs/db/multilingual-support.md` (신규)
- `docs/dev-log.md` (수정)
- `CHANGELOG.md` (수정)

---

## 8. 완료 체크리스트

### 기능 완성도
- [ ] 한국어 메시지 입력 시 언어 'ko'로 자동 감지 및 저장
- [ ] 영어 메시지 입력 시 언어 'en'으로 자동 감지 및 저장
- [ ] 감지된 언어로 OpenAI 답변 생성 (한국어 대화 → 한국어 답변, 영어 대화 → 영어 답변)
- [ ] 카테고리 이름이 언어에 맞게 반환됨 (영어 대화 → "Product Inquiry")
- [ ] 에스컬레이션 메시지가 언어에 맞게 표시됨
- [ ] UI 언어 전환 버튼 작동 (한국어 ↔ 영어)
- [ ] 대화 언어 수동 변경 API (`PATCH /api/conversations/:id/language`) 정상 작동
- [ ] 대화 이력 조회 시 `language` 필드 포함

### DB 스키마
- [ ] `conversation` 테이블에 `language` 컬럼 추가 (enum: 'ko' | 'en', 기본값: 'ko')
- [ ] `category` 테이블에 `name_ko`, `name_en` 컬럼 추가
- [ ] 기존 5개 카테고리의 영어 이름 시드 데이터 삽입
- [ ] 인덱스 추가: `conversation.language`, `faq_template.language` 등

### 프롬프트 및 메시지
- [ ] 시스템 프롬프트가 언어별로 분리됨 (한국어/영어)
- [ ] 에스컬레이션 메시지가 언어별로 분리됨
- [ ] 폴백 메시지(API 오류)가 언어별로 분리됨
- [ ] 프롬프트에 언어 지시 포함 (명시적 또는 네이티브 프롬프트)

### 프론트엔드 UI
- [ ] 채팅 입력 placeholder가 언어에 맞게 표시됨
- [ ] 버튼 텍스트("전송", "상담원 연결" 등)가 언어에 맞게 표시됨
- [ ] 로딩 메시지가 언어에 맞게 표시됨
- [ ] 언어 토글 버튼이 작동하고 UI가 즉시 변경됨
- [ ] 브라우저 새로고침 시 선택한 언어 유지 (localStorage)

### 보안 및 성능
- [ ] `language` 파라미터 검증 ('ko' 또는 'en'만 허용)
- [ ] 권한 없는 사용자가 언어 변경 시 403 에러
- [ ] 언어 감지로 인한 추가 지연시간 최소화 (50ms 이하)
- [ ] 답변 생성 시간 기존과 동일 (5초 이내, 95% 요청)

### 테스트
- [ ] 한국어 대화 시나리오 테스트 통과
- [ ] 영어 대화 시나리오 테스트 통과
- [ ] 언어 수동 변경 시나리오 테스트 통과
- [ ] 언어 감지 실패 시나리오 테스트 통과 (폴백 언어)
- [ ] 카테고리 다국어 조회 테스트 통과
- [ ] 기존 한국어 기능이 정상 작동하는지 회귀 테스트 통과

### 문서화
- [ ] API 스펙 확정본 작성 (`docs/api/multilingual-support.md`)
- [ ] DB 스키마 설계서 작성 (`docs/db/multilingual-support.md`)
- [ ] 진행 로그 업데이트 (`docs/dev-log.md`)
- [ ] CHANGELOG 업데이트

### 하위 호환성
- [ ] 기존 한국어 대화 데이터가 정상 작동 (language: 'ko' 또는 NULL)
- [ ] 기존 카테고리가 정상 작동 (name_ko = 기존 name, name_en 추가)
- [ ] 기존 템플릿이 정상 작동 (language: 'ko' 기본값)

---

## 9. 변경 이력

| 날짜 | 변경 내용 | 변경 사유 |
|------|-----------|-----------|
| 2026-02-12 | 초안 작성 | F-10 구현 계획서 작성 시작 |

---

## 10. 다음 단계

1. **backend-dev**: Phase 1 + Phase 2 구현
   - DB 마이그레이션 (Task 1-1 ~ 1-4)
   - 언어 감지 로직 (Task 2-1)
   - 언어별 프롬프트 (Task 2-2 ~ 2-3)
   - openai.service.ts 수정 (Task 2-4, 하위 호환성 필수)
   - chat.service.ts 수정 (Task 2-5)
   - conversation.service.ts 수정 (Task 2-6)
   - API 엔드포인트 추가 (Task 2-7 ~ 2-10)

2. **frontend-dev**: Phase 3 구현
   - next-intl 설정 (Task 3-1 ~ 3-2)
   - 언어 Context 및 Hook (Task 3-3)
   - 언어 토글 UI (Task 3-4)
   - API 연동 (Task 3-5 ~ 3-6)
   - UI 텍스트 다국어화 (Task 3-7 ~ 3-8)

3. **test-runner**: Phase 4 테스트
   - 언어 감지 단위 테스트 (Task 4-1)
   - 통합 테스트 (Task 4-2 ~ 4-4)
   - 회귀 테스트 (Task 4-5)
   - E2E 테스트 (Task 4-6)

4. **code-reviewer**: Phase 5 리뷰
   - 하위 호환성 검증 (Task 5-1)
   - 성능 영향 검토
   - 설계 ↔ 구현 일치 확인

5. **doc-writer**: Phase 5 문서화
   - API 스펙 확정본 (Task 5-2)
   - DB 스키마 설계서 (Task 5-3)
   - 진행 로그 + CHANGELOG (Task 5-4)

---

## 11. 추가 노트

### Phase 2 주의사항 (openai.service.ts 수정)
- **반드시** 기존 함수 시그니처에 기본값 추가 방식으로 수정할 것
  ```typescript
  // ✅ 올바른 방식 (하위 호환성 유지)
  export async function generateAnswer(
    history: ...,
    message: string,
    category?: string,
    language: 'ko' | 'en' = 'ko'  // ← 기본값 필수
  ): Promise<...> {
    // ...
  }

  // ❌ 잘못된 방식 (기존 코드 깨짐)
  export async function generateAnswer(
    history: ...,
    message: string,
    category?: string,
    language: 'ko' | 'en'  // ← 기본값 없음
  ): Promise<...> {
    // ...
  }
  ```

### Phase 3 주의사항 (next-intl 설정)
- Next.js 14 App Router에서는 `i18n.ts` 설정 파일이 필수
- `getRequestConfig`를 사용하여 서버 컴포넌트에서도 번역 가능
- 참고 문서: https://next-intl-docs.vercel.app/docs/getting-started/app-router

### Phase 4 주의사항 (회귀 테스트)
- 회귀 테스트는 **모든 기존 테스트를 재실행**하는 것
- F-02, F-03의 기존 테스트가 통과하지 않으면 Phase 2 수정사항 롤백 필요
- 회귀 테스트 실패 시 **즉시 보고**하여 조기 대응

### 성능 모니터링
- 언어 감지 추가로 인한 응답 시간 증가 모니터링
- 목표: 50ms 이하 추가 지연 (franc 라이브러리)
- 5초 이내 전체 응답 시간 유지 (95 percentile)
