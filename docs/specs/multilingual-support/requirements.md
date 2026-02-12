# 다국어 지원 (F-10) — 요구사항 분석서

## 1. 개요

- **기능명**: 다국어 지원 (Multilingual Support)
- **기능 ID**: F-10
- **목적**: 한국어와 영어 고객 모두에게 자연스러운 챗봇 경험을 제공하기 위해 언어 자동 감지 및 해당 언어로 답변 생성
- **대상 사용자**:
  - **일반 고객 (customer)**: 한국어 또는 영어로 문의하는 최종 사용자
  - **익명 사용자 (anonymous)**: 비회원으로 한국어/영어 챗봇을 이용하는 사용자
  - **관리자 (admin)**: FAQ 템플릿을 다국어로 관리하는 사용자
- **요청 배경**:
  - 글로벌 고객 지원을 위한 영어 인터페이스 및 답변 제공
  - 언어별 고객 경험 일관성 유지 (UI + 답변 모두 동일 언어)
  - 기존 한국어 전용 시스템을 확장하여 다국어 지원 인프라 구축
- **마일스톤**: M4 (추가 기능)
- **우선순위**: Could (선택적 기능)
- **의존성**: F-02 (문의 자동 분류), F-03 (자동 답변) — 모두 완료됨
- **병렬 그룹**: 단독 실행 (openai.service.ts, i18n 충돌 가능)

---

## 2. 기능 요구사항 (Functional Requirements)

### FR-1: 사용자 메시지 언어 자동 감지
- **설명**: 고객이 입력한 메시지의 언어를 자동으로 감지 (한국어 또는 영어)
- **유저 스토리**: As a 고객, I want 내 언어로 질문하면 자동으로 그 언어로 답변을 받고 싶음, so that 언어를 수동으로 선택하지 않아도 됨
- **우선순위**: Must
- **상세 요구사항**:
  - **감지 방법**:
    - 옵션 1 (권장): OpenAI API의 자동 언어 감지 기능 활용 (프롬프트에 언어 감지 지시)
    - 옵션 2: 경량 라이브러리 사용 (`franc`, `cld` 등) — 비용 절감, 속도 우위
  - **지원 언어**: 한국어(ko), 영어(en)
  - **폴백 전략**:
    - 감지 실패 시 기본 언어: 한국어(ko)
    - 감지 신뢰도가 낮으면 (50% 이하) 한국어로 설정
  - **감지 타이밍**: 첫 번째 메시지 수신 시 감지 → 대화 세션에 언어 저장
  - **언어 고정**: 대화 세션 중에는 첫 메시지에서 감지한 언어 유지 (재감지하지 않음)
  - **저장 위치**: `conversation` 테이블에 `language` 컬럼 추가 (enum: 'ko' | 'en')
- **검증 기준**:
  - 한국어 메시지("배송은 얼마나 걸리나요?") 입력 시 언어: 'ko' 저장
  - 영어 메시지("How long does shipping take?") 입력 시 언어: 'en' 저장
  - 감지 실패 시 기본값 'ko' 설정
  - 두 번째 메시지부터는 언어 재감지 없이 기존 언어 사용

### FR-2: 감지된 언어로 AI 답변 생성
- **설명**: F-03의 답변 생성 로직을 확장하여 감지된 언어로 OpenAI 프롬프트 작성 및 답변 생성
- **유저 스토리**: As a 영어 고객, I want 영어로 질문하면 영어로 답변을 받고 싶음, so that 의사소통이 원활함
- **우선순위**: Must
- **상세 요구사항**:
  - **프롬프트 다국어화**:
    - 시스템 메시지를 언어별로 분리:
      - 한국어: "당신은 친절한 고객 상담 챗봇입니다..."
      - 영어: "You are a friendly customer service chatbot..."
    - 카테고리 이름, 에스컬레이션 메시지도 언어별로 번역
  - **OpenAI API 지시**:
    - 프롬프트에 명시: "Please respond in Korean" 또는 "Please respond in English"
    - GPT 모델의 다국어 능력 활용 (GPT-3.5-turbo, GPT-4 모두 지원)
  - **답변 언어 일관성**:
    - 대화 이력 전체가 동일 언어로 유지되도록 프롬프트 구성
    - 사용자가 도중에 언어를 바꾸더라도 첫 감지 언어로 답변 유지
  - **기존 로직 수정**:
    - `openai.service.ts`의 `generateAnswer()` 함수에 `language` 파라미터 추가
    - 언어별 프롬프트 템플릿을 설정 파일 또는 상수로 관리
- **검증 기준**:
  - 한국어 대화 세션에서 한국어 답변 생성
  - 영어 대화 세션에서 영어 답변 생성
  - 프롬프트에 언어 지시가 포함됨
  - 답변이 요청한 언어로 일관되게 생성됨

### FR-3: 카테고리 및 에스컬레이션 메시지 다국어 지원
- **설명**: F-02의 분류 API와 F-06의 에스컬레이션 메시지를 다국어로 확장
- **유저 스토리**: As a 영어 고객, I want 분류 결과와 에스컬레이션 안내도 영어로 받고 싶음, so that 모든 정보를 이해할 수 있음
- **우선순위**: Must
- **상세 요구사항**:
  - **카테고리 이름 다국어화**:
    - `category` 테이블에 `name_ko`, `name_en` 컬럼 추가
    - 예시:
      - name_ko: "상품문의", name_en: "Product Inquiry"
      - name_ko: "배송문의", name_en: "Shipping Inquiry"
      - name_ko: "반품/교환", name_en: "Return/Exchange"
      - name_ko: "결제문의", name_en: "Payment Inquiry"
      - name_ko: "기타", name_en: "Other"
    - API 응답 시 `conversation.language`에 따라 적절한 이름 반환
  - **에스컬레이션 메시지 다국어화**:
    - 한국어: "이 문의는 상담원 연결이 필요합니다. 잠시만 기다려 주시면 담당자가 확인 후 연락드리겠습니다."
    - 영어: "This inquiry requires an agent. Please wait, and a representative will contact you shortly."
  - **시스템 메시지 다국어화**:
    - 에러 메시지, 폴백 메시지, 타임아웃 메시지 등을 언어별로 분리
  - **구현 방식**:
    - i18n 라이브러리 사용 (`i18next` 권장) 또는 단순 객체 맵핑
    - `lib/i18n.ts`에 번역 리소스 정의
- **검증 기준**:
  - 영어 대화에서 카테고리 이름이 영어로 반환됨
  - 영어 대화에서 에스컬레이션 메시지가 영어로 표시됨
  - 시스템 메시지가 언어에 맞게 표시됨

### FR-4: UI 언어 전환 기능 (프론트엔드)
- **설명**: 사용자가 수동으로 언어를 전환할 수 있는 UI 제공 (한국어 ↔ 영어)
- **유저 스토리**: As a 고객, I want 자동 감지가 잘못되었을 때 수동으로 언어를 변경하고 싶음, so that 올바른 언어로 서비스를 이용할 수 있음
- **우선순위**: Should
- **상세 요구사항**:
  - **UI 배치**: 채팅 창 상단 또는 설정 메뉴에 언어 토글 버튼
    - 예: 🌐 KO | EN
  - **전환 동작**:
    - 언어 변경 시 API 호출 (`PATCH /api/conversations/:id`) → `conversation.language` 업데이트
    - 이후 메시지부터 변경된 언어로 답변 생성
    - 기존 메시지 이력은 그대로 유지 (재번역하지 않음)
  - **UI 텍스트 번역**:
    - 채팅 입력 placeholder: "메시지를 입력하세요" / "Enter your message"
    - 버튼: "전송" / "Send", "상담원 연결" / "Contact Agent"
    - 로딩 메시지: "답변 생성 중..." / "Generating response..."
  - **프론트엔드 i18n**:
    - Next.js 14 App Router의 `next-intl` 또는 `i18next-react` 사용
    - 언어 상태를 Context API 또는 Zustand로 전역 관리
- **검증 기준**:
  - 언어 토글 버튼 클릭 시 UI 텍스트가 즉시 변경됨
  - 언어 변경 후 새 메시지 전송 시 변경된 언어로 답변 생성
  - 브라우저 새로고침 시 선택한 언어 유지 (localStorage)

### FR-5: FAQ 템플릿 다국어 버전 관리 (F-07 연계)
- **설명**: 관리자가 FAQ 템플릿을 한국어/영어로 등록 및 관리
- **유저 스토리**: As a 관리자, I want FAQ 템플릿을 한국어와 영어로 등록하고 싶음, so that 두 언어 고객 모두 일관된 답변을 받을 수 있음
- **우선순위**: Should (F-07 완료 후 추가 가능)
- **상세 요구사항**:
  - **DB 스키마 변경**:
    - `faq_template` 테이블에 `language` 컬럼 추가 (enum: 'ko' | 'en')
    - 또는 `question_ko`, `question_en`, `answer_ko`, `answer_en` 컬럼 분리
  - **관리자 UI**:
    - 템플릿 등록 시 언어별로 각각 입력 (탭 또는 폼 분리)
    - 예: 한국어 탭 - 질문: "배송 기간은?", 답변: "2-3일 소요"
           영어 탭 - 질문: "Shipping time?", 답변: "Takes 2-3 days"
  - **템플릿 매칭**:
    - F-03의 답변 생성 시 `conversation.language`에 맞는 템플릿 우선 조회
    - 해당 언어 템플릿이 없으면 AI 답변 생성
  - **API 수정**:
    - `GET /api/templates` — 쿼리 파라미터 `language` 추가 (예: `?language=en`)
    - `POST /api/templates` — 요청 본문에 `language` 필드 추가
- **검증 기준**:
  - 관리자가 영어 템플릿을 등록할 수 있음
  - 영어 고객 문의 시 영어 템플릿 답변 우선 반환
  - 템플릿이 없는 언어는 AI 답변 생성

### FR-6: 대화 언어 변경 API
- **설명**: 대화 세션의 언어를 수동으로 변경할 수 있는 API 제공
- **유저 스토리**: As a 프론트엔드, I want 사용자가 언어를 변경하면 서버에 반영하고 싶음, so that 이후 답변이 변경된 언어로 생성됨
- **우선순위**: Should
- **상세 요구사항**:
  - **엔드포인트**: `PATCH /api/conversations/:id/language`
  - **인증**: `requireAuth` 미들웨어
  - **요청 본문**:
    ```json
    {
      "language": "en"  // 'ko' 또는 'en'
    }
    ```
  - **응답**:
    ```json
    {
      "success": true,
      "data": {
        "conversationId": "uuid-1234",
        "language": "en",
        "updatedAt": "2026-02-12T10:00:00Z"
      }
    }
    ```
  - **검증**:
    - `language`는 'ko' 또는 'en'만 허용 (다른 값 시 400 에러)
    - 대화 소유자만 변경 가능 (권한 검증)
- **검증 기준**:
  - 유효한 요청 시 200 + 변경된 언어 반환
  - 잘못된 언어 코드 시 400 에러
  - 권한 없는 사용자가 호출 시 403 에러
  - 변경 후 새 메시지 전송 시 변경된 언어로 답변 생성

### FR-7: 대화 이력 조회 시 언어 정보 포함
- **설명**: F-04의 대화 이력 조회 API에서 언어 정보도 함께 반환
- **유저 스토리**: As a 프론트엔드, I want 대화 이력을 조회할 때 언어 정보를 알고 싶음, so that UI를 적절한 언어로 표시할 수 있음
- **우선순위**: Must
- **상세 요구사항**:
  - **API 응답 수정**:
    - `GET /api/conversations` — 각 대화에 `language` 필드 추가
    - `GET /api/conversations/:id` — 대화 상세 정보에 `language` 필드 추가
  - **예시 응답**:
    ```json
    {
      "success": true,
      "data": {
        "conversationId": "uuid-1234",
        "language": "en",
        "category": { "id": "uuid-cat-1", "name": "Product Inquiry" },
        "messages": [...]
      }
    }
    ```
- **검증 기준**:
  - 대화 목록 조회 시 모든 대화에 `language` 필드 포함
  - 대화 상세 조회 시 `language` 필드 포함
  - 프론트엔드가 이 정보를 기반으로 UI 언어 설정 가능

---

## 3. 비기능 요구사항 (Non-Functional Requirements)

### 성능
- **언어 감지 추가 지연시간**: 50ms 이하 (경량 라이브러리 사용 시) 또는 OpenAI API 응답 시간에 포함
- **답변 생성 시간**: 기존 F-03과 동일 (5초 이내, 95 percentile) — 다국어 지원으로 인한 추가 지연 최소화
- **캐싱**: 언어별 프롬프트 템플릿을 메모리에 캐싱하여 조회 성능 최적화
- **DB 쿼리 최적화**: `conversation.language` 인덱스 추가로 언어별 통계 조회 성능 보장

### 보안
- **입력 검증**: `language` 파라미터는 enum('ko', 'en')만 허용, 다른 값 시 400 에러
- **XSS 방지**: 다국어 메시지도 기존과 동일한 sanitization 적용
- **API 키 보호**: OpenAI API 키는 기존과 동일하게 환경변수로 관리

### 확장성
- **언어 추가 용이성**:
  - 새 언어(일본어, 중국어 등) 추가 시 enum 확장 + 번역 리소스 추가만으로 지원 가능
  - DB 마이그레이션 없이 번역 리소스 파일만 수정하여 확장
- **프롬프트 관리**:
  - 언어별 프롬프트 템플릿을 설정 파일(`lib/i18n-prompts.ts`) 또는 DB에 저장하여 동적 변경 가능
- **UI 국제화**:
  - Next.js의 i18n 라우팅 활용 가능 (`/en/chat`, `/ko/chat`)
  - 번역 리소스를 JSON 파일로 분리하여 번역가와 협업 용이

### 호환성
- **기존 기능과의 호환**:
  - F-02 (분류): 카테고리 다국어화로 기존 로직 유지
  - F-03 (답변): 프롬프트 확장으로 기존 로직 유지
  - F-07 (템플릿): 언어 필드 추가로 기존 템플릿 호환 (기본값: 'ko')
  - F-08 (대시보드): 언어별 통계 추가 가능 (선택)
- **마이그레이션 전략**:
  - 기존 대화 데이터의 `language`는 NULL 또는 'ko'로 설정
  - 새 대화부터 언어 감지 활성화
  - 관리자 템플릿은 점진적으로 영어 버전 추가

### 품질
- **번역 품질**:
  - UI 텍스트는 원어민 검수 권장 (초기에는 개발자 번역 가능)
  - OpenAI 답변은 GPT의 다국어 능력에 의존 (일반적으로 높은 품질)
- **언어 감지 정확도**:
  - 최소 목표: 90% 이상 정확도
  - 짧은 메시지(5자 미만)는 감지 어려움 → 폴백 전략 필수
- **일관성**:
  - 대화 세션 내에서 언어가 변경되지 않도록 첫 감지 언어 고정
  - 사용자가 도중에 언어를 바꾸더라도 시스템 언어는 유지

---

## 4. 제약조건

### 기술 제약
- **기술 스택 고정**: 기존 스택 유지 (Express.js + Prisma + PostgreSQL 16 + Next.js 14)
- **지원 언어**: 한국어(ko), 영어(en)만 지원 (1차 버전)
- **언어 감지 라이브러리**:
  - 옵션 1: `franc` (경량, 오프라인, 75개 언어)
  - 옵션 2: `cld` (Google의 Compact Language Detector, 빠르고 정확)
  - 옵션 3: OpenAI API 프롬프트 (추가 비용, 느림)
- **i18n 라이브러리**:
  - 백엔드: `i18next` 또는 단순 객체 맵핑
  - 프론트엔드: `next-intl` (Next.js 14 App Router 호환)
- **DB 스키마 변경**:
  - `conversation` 테이블에 `language` 컬럼 추가 (enum: 'ko' | 'en', 기본값: 'ko')
  - `category` 테이블에 `name_ko`, `name_en` 컬럼 추가
  - `faq_template` 테이블에 `language` 컬럼 추가 (선택)

### 의존성
- **F-02 완료 필수**: 분류 API가 구현되어 있어야 카테고리 다국어화 가능
- **F-03 완료 필수**: 답변 생성 로직이 구현되어 있어야 프롬프트 확장 가능
- **F-07 완료 권장**: 템플릿 관리 기능이 있어야 다국어 템플릿 관리 가능 (선택)
- **openai.service.ts 수정 필요**: 기존 F-02, F-03에서 사용 중인 공유 모듈 수정 필요

### 정책 제약
- **OpenAI API 비용**: 다국어 프롬프트로 인한 토큰 사용량 약간 증가 (10~15%)
- **번역 품질**: OpenAI GPT 모델의 다국어 능력에 의존 (자체 번역 엔진 없음)
- **GDPR 준수**: 영어 고객 데이터도 OpenAI API에 전송 → 동일한 프라이버시 정책 적용
- **문화적 고려사항**: 영어권 고객의 톤 기대치 반영 (친근함 정도, 형식성)

### 충돌 영역 (단독 작업 권장)
- **백엔드 모듈**: `openai.service.ts` (F-02, F-03과 공유) — 프롬프트 로직 수정 필요
- **DB 테이블**: `conversation`, `category`, `faq_template` — 스키마 변경 필요
- **프론트엔드**: 모든 UI 컴포넌트 — i18n 적용 필요
- **해결 방안**:
  - 기존 기능(F-02, F-03) 완료 후 단독으로 작업
  - openai.service.ts 수정 시 기존 로직을 깨지 않도록 하위 호환성 유지
  - 테스트로 기존 한국어 기능이 정상 작동하는지 검증

---

## 5. 용어 정의

| 용어 | 정의 |
|------|------|
| 언어 감지 (Language Detection) | 텍스트를 분석하여 작성 언어를 자동으로 식별하는 작업 |
| 다국어 지원 (Multilingual Support) | 여러 언어로 서비스를 제공하는 기능 (언어 감지 + 번역 + UI 다국어화) |
| 국제화 (i18n, Internationalization) | 소프트웨어를 여러 언어/문화권에 맞게 적응시키는 프로세스 |
| 현지화 (l10n, Localization) | 특정 언어/문화권에 맞게 번역 및 조정하는 작업 |
| 프롬프트 다국어화 (Multilingual Prompt) | OpenAI API 프롬프트를 언어별로 작성하여 적절한 언어로 답변을 생성하는 방식 |
| 언어 코드 (Language Code) | ISO 639-1 표준 코드 (예: 'ko' = 한국어, 'en' = 영어) |
| 폴백 언어 (Fallback Language) | 언어 감지 실패 시 사용할 기본 언어 (이 프로젝트는 한국어) |
| 번역 리소스 (Translation Resource) | UI 텍스트, 시스템 메시지 등의 번역본을 저장한 파일 또는 객체 |

---

## 6. 범위 외 (Out of Scope)

- **3개 이상 언어 지원**: 일본어, 중국어, 스페인어 등 (추후 확장)
- **실시간 번역**: 한국어 메시지를 영어로 자동 번역하는 기능 (사용자가 입력한 언어 그대로 처리)
- **언어 혼용 감지**: 한 메시지에 한국어+영어가 섞인 경우 처리 (첫 감지 언어만 사용)
- **음성 입력 언어 감지**: 텍스트 기반만 지원 (음성은 제외)
- **방언/구어체 지원**: 표준 한국어, 표준 영어만 지원
- **시간대/날짜 형식 현지화**: 언어와 무관하게 UTC 기준 사용
- **통화/단위 현지화**: "원", "달러" 등 단위 변환 없음
- **문화적 금기어 필터링**: 일반적인 XSS 방지만 적용
- **자동 번역 API 연동**: Google Translate, DeepL 등 외부 번역 API 사용 안 함

---

## 7. 인수 기준 (Acceptance Criteria)

> 다음 조건이 모두 충족되면 F-10 완료로 간주

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
- [ ] 인덱스 추가: `conversation.language` (언어별 통계 쿼리 최적화)

### 프롬프트 및 메시지
- [ ] 시스템 프롬프트가 언어별로 분리됨 (한국어/영어)
- [ ] 에스컬레이션 메시지가 언어별로 분리됨
- [ ] 폴백 메시지(API 오류)가 언어별로 분리됨
- [ ] 프롬프트에 "Please respond in [language]" 지시 포함

### 프론트엔드 UI
- [ ] 채팅 입력 placeholder가 언어에 맞게 표시됨
- [ ] 버튼 텍스트("전송", "상담원 연결" 등)가 언어에 맞게 표시됨
- [ ] 로딩 메시지가 언어에 맞게 표시됨
- [ ] 언어 토글 버튼이 작동하고 UI가 즉시 변경됨
- [ ] 브라우저 새로고침 시 선택한 언어 유지 (localStorage)

### 보안 및 성능
- [ ] `language` 파라미터 검증 ('ko' 또는 'en'만 허용)
- [ ] 권한 없는 사용자가 언어 변경 시 403 에러
- [ ] 언어 감지로 인한 추가 지연시간 최소화 (50ms 이하 또는 OpenAI 응답 시간에 포함)
- [ ] 답변 생성 시간 기존과 동일 (5초 이내, 95% 요청)

### 테스트
- [ ] 한국어 대화 시나리오 테스트 통과 (언어 감지 → 한국어 답변)
- [ ] 영어 대화 시나리오 테스트 통과 (언어 감지 → 영어 답변)
- [ ] 언어 수동 변경 시나리오 테스트 통과 (ko → en 전환 후 영어 답변)
- [ ] 언어 감지 실패 시나리오 테스트 통과 (폴백 언어 'ko')
- [ ] 카테고리 다국어 조회 테스트 통과
- [ ] 기존 한국어 기능이 정상 작동하는지 회귀 테스트 통과

### 문서화
- [ ] API 스펙 확정본 업데이트 (`docs/api/multilingual-support.md`)
- [ ] DB 스키마 설계서 업데이트 (`docs/db/multilingual-support.md`)
- [ ] i18n 번역 리소스 문서화 (`docs/specs/multilingual-support/i18n-resources.md`) (선택)
- [ ] 환경변수 문서에 `DEFAULT_LANGUAGE` 추가 (선택)

### 통합
- [ ] F-02 (분류)와 통합: 카테고리 다국어 이름 반환
- [ ] F-03 (답변)과 통합: 언어별 프롬프트로 답변 생성
- [ ] F-04 (대화 이력)와 통합: 언어 정보 포함하여 조회
- [ ] F-07 (템플릿)과 통합: 언어별 템플릿 조회 (선택)
- [ ] 프론트엔드와 통합: UI 언어 전환 기능 확인

### 하위 호환성
- [ ] 기존 한국어 대화 데이터가 정상 작동 (language: 'ko' 또는 NULL)
- [ ] 기존 카테고리가 정상 작동 (name_ko = 기존 name, name_en 추가)
- [ ] 기존 템플릿이 정상 작동 (language: 'ko' 기본값)

---

## 8. 변경 이력

| 날짜 | 변경 내용 | 변경 사유 |
|------|-----------|-----------|
| 2026-02-12 | 초안 작성 | F-10 요구사항 분석 시작 |

---

## 9. 참고 자료

- **PRD**: `docs/project/prd.md`
- **기능 백로그**: `docs/project/features.md`
- **F-02 요구사항 분석서**: `docs/specs/inquiry-classification/requirements.md`
- **F-03 요구사항 분석서**: `docs/specs/auto-response/requirements.md`
- **OpenAI 다국어 가이드**: https://platform.openai.com/docs/guides/gpt-best-practices
- **i18next 문서**: https://www.i18next.com/
- **next-intl 문서**: https://next-intl-docs.vercel.app/
- **franc 라이브러리**: https://github.com/wooorm/franc
- **ISO 639-1 언어 코드**: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- **Next.js i18n 라우팅**: https://nextjs.org/docs/app/building-your-application/routing/internationalization

---

## 10. 다음 단계

1. **architect**: `docs/specs/multilingual-support/design.md` 작성
   - DB 스키마 변경 설계 (conversation.language, category.name_ko/name_en)
   - OpenAI 프롬프트 다국어화 전략
   - API 엔드포인트 수정 (language 파라미터 추가)
   - 언어 감지 방식 선택 (franc vs OpenAI)
   - 시퀀스 다이어그램 (언어 감지 → 답변 생성 플로우)
   - 기존 기능과의 호환성 검토

2. **product-manager**: architect의 설계 완료 후 `docs/specs/multilingual-support/plan.md` 작성
   - 구현 태스크 분해 (백엔드 → 프론트엔드 → 테스트)
   - 단독 실행 계획 (openai.service.ts 충돌 회피)
   - 마이그레이션 전략 (기존 데이터 처리)

3. **backend-dev**: plan.md 기반으로 백엔드 구현
   - DB 마이그레이션 (language 컬럼 추가)
   - 언어 감지 로직 구현
   - openai.service.ts 프롬프트 다국어화
   - API 엔드포인트 수정
   - API 스펙 확정본 작성

4. **frontend-dev**: 프론트엔드 구현
   - i18n 설정 (next-intl)
   - 언어 토글 UI
   - 번역 리소스 작성
   - API 연동

5. **test-runner**: 테스트 작성 및 실행
   - 언어 감지 테스트
   - 다국어 답변 생성 테스트
   - 회귀 테스트 (기존 한국어 기능)

6. **code-reviewer**: 코드 및 문서 검증
   - 하위 호환성 검증
   - 성능 영향 검토
   - 설계↔구현 일치 확인

7. **doc-writer**: 진행 로그 + CHANGELOG 업데이트
