# 다국어 지원 (F-10) — 기술 설계서

## 1. 참조
- **요구사항 분석서**: `docs/specs/multilingual-support/requirements.md`
- **기존 시스템**:
  - F-02 (문의 자동 분류): `classification.service.ts`
  - F-03 (자동 답변): `chat.service.ts`, `openai.service.ts`
  - F-04 (대화 이력): `conversation.service.ts`
  - F-07 (템플릿 관리): `template.service.ts`
- **관련 문서**:
  - API 스펙: `docs/api/inquiry-classification.md`, `docs/api/auto-response.md`
  - DB 스키마: `backend/prisma/schema.prisma`

---

## 2. 아키텍처 결정

### 결정 1: 언어 감지 방식

- **선택지**:
  - A) OpenAI API를 활용한 언어 감지 (프롬프트에 언어 감지 지시 추가)
  - B) 경량 라이브러리 사용 (`franc` - 75개 언어 지원, 오프라인)
  - C) `cld` (Compact Language Detector - Google 기반, 빠르고 정확)

- **결정**: **B) franc 라이브러리 사용**

- **근거**:
  - **비용 효율성**: OpenAI API 호출 없이 로컬에서 즉시 감지 (토큰 사용량 절감)
  - **성능**: 50ms 이하의 빠른 응답 시간 (CLD도 비슷하지만 franc이 npm 다운로드 수 우위)
  - **정확도**: 한국어/영어 감지에서는 90% 이상 정확도 보장
  - **오프라인**: 외부 API 의존성 없음 (네트워크 장애 시에도 작동)
  - **확장성**: 향후 일본어, 중국어 추가 시 동일 라이브러리로 지원 가능

- **트레이드오프**:
  - **포기한 것**: OpenAI의 맥락 기반 언어 감지 (더 정확하지만 느리고 비용 발생)
  - **얻은 것**: 빠른 응답, 비용 절감, 외부 API 의존성 제거
  - **위험 관리**: 짧은 메시지(5자 미만)에서 정확도 낮아질 수 있음 → 폴백 언어(ko) 전략으로 해결

### 결정 2: DB 스키마 설계 (다국어 컬럼 구조)

- **선택지**:
  - A) 단일 컬럼 방식: `conversation.language`, `category.name_ko`, `category.name_en`
  - B) JSON 방식: `category.names { ko: "...", en: "..." }`
  - C) 별도 테이블: `category_translations` (1:N 관계)

- **결정**: **A) 단일 컬럼 방식**

- **근거**:
  - **단순성**: 2개 언어만 지원하므로 컬럼 추가가 가장 간단 (마이그레이션 용이)
  - **성능**: JSON 파싱이나 JOIN 없이 직접 조회 가능 (쿼리 최적화)
  - **타입 안전성**: Prisma 스키마에서 타입 정의 명확 (JSON은 런타임 검증 필요)
  - **인덱싱**: `conversation.language`에 인덱스 추가로 언어별 통계 쿼리 최적화 가능

- **트레이드오프**:
  - **포기한 것**: 3개 이상 언어 추가 시 컬럼 계속 증가 (JSON/별도 테이블이 유리)
  - **얻은 것**: 쿼리 성능, 코드 단순성, 마이그레이션 용이성
  - **마이그레이션 전략**: 추후 5개 이상 언어 지원 시 JSON으로 전환 고려

### 결정 3: OpenAI 프롬프트 다국어화 전략

- **선택지**:
  - A) 시스템 프롬프트를 언어별로 완전히 분리 (한국어/영어 프롬프트 각각 작성)
  - B) 영어 프롬프트 + "Please respond in [language]" 지시
  - C) 다국어 프롬프트 템플릿 + 동적 언어 삽입

- **결정**: **A) 시스템 프롬프트를 언어별로 완전히 분리**

- **근거**:
  - **문화적 맥락**: 한국어 고객과 영어 고객의 톤 기대치가 다름 (친근함 정도, 존댓말 vs you)
  - **자연스러움**: GPT가 영어 프롬프트를 한국어로 번역하는 것보다, 네이티브 프롬프트가 더 자연스러운 답변 생성
  - **유지보수**: 언어별 프롬프트를 독립적으로 최적화 가능 (A/B 테스트 용이)
  - **명확성**: "Please respond in Korean" 같은 지시보다 직관적

- **트레이드오프**:
  - **포기한 것**: 프롬프트 중복 관리 (한국어/영어 각각 업데이트 필요)
  - **얻은 것**: 더 자연스러운 답변, 문화적 맥락 반영, A/B 테스트 가능
  - **구현 방안**: `lib/prompts.ts`에 언어별 프롬프트 객체로 관리

### 결정 4: 프론트엔드 i18n 라이브러리

- **선택지**:
  - A) `next-intl` (Next.js 14 App Router 공식 권장)
  - B) `react-i18next` (클라이언트 전용, 많이 사용됨)
  - C) 단순 객체 맵핑 (`lib/translations.ts`)

- **결정**: **A) next-intl**

- **근거**:
  - **Next.js 14 호환성**: App Router와 Server Components 지원 (RSC에서도 번역 가능)
  - **타입 안전성**: TypeScript 타입 추론 지원 (번역 키 오타 방지)
  - **SSR 최적화**: 서버 사이드 렌더링 시 언어별 초기 HTML 생성 가능
  - **라우팅 통합**: 추후 `/ko`, `/en` 경로 분리 가능 (URL 기반 언어 전환)
  - **커뮤니티**: Next.js 공식 문서에서 권장, 활발한 업데이트

- **트레이드오프**:
  - **포기한 것**: 간단한 객체 맵핑의 단순함 (설정 파일 필요)
  - **얻은 것**: 타입 안전성, SSR 지원, 라우팅 통합, 확장성
  - **학습 곡선**: `next-intl` 설정 필요 (10-20분 소요)

### 결정 5: 언어 전환 시 기존 메시지 처리

- **선택지**:
  - A) 기존 메시지 이력을 새 언어로 자동 번역
  - B) 기존 메시지는 그대로 유지, 이후 메시지만 새 언어로 생성
  - C) 언어 변경 시 대화 세션 초기화 (새 대화 시작)

- **결정**: **B) 기존 메시지는 그대로 유지, 이후 메시지만 새 언어로 생성**

- **근거**:
  - **투명성**: 사용자가 이미 입력한 메시지를 임의로 변경하지 않음 (UX 신뢰성)
  - **정확성**: 자동 번역은 OpenAI 추가 비용 발생 + 오역 가능성
  - **맥락 보존**: 대화 이력이 그대로 남아 상담원 에스컬레이션 시 맥락 파악 가능
  - **단순성**: 번역 로직 불필요 (구현 복잡도 감소)

- **트레이드오프**:
  - **포기한 것**: 언어 전환 시 이전 메시지도 번역되는 일관성 (Google Translate 스타일)
  - **얻은 것**: 구현 단순성, 비용 절감, 맥락 보존
  - **UX 보완**: 언어 변경 시 "Language changed to English. Previous messages remain in original language." 알림 표시

### 결정 6: FAQ 템플릿 다국어 지원 방식 (F-07 연계)

- **선택지**:
  - A) `faq_template.language` 컬럼 추가 (같은 질문을 ko/en으로 각각 등록)
  - B) `question_ko`, `question_en`, `answer_ko`, `answer_en` 컬럼 추가 (단일 레코드에 모든 언어)
  - C) 1차 버전에서는 제외, 추후 F-07 확장 시 추가

- **결정**: **A) faq_template.language 컬럼 추가**

- **근거**:
  - **유연성**: 같은 질문이라도 언어별로 키워드, 우선순위가 다를 수 있음 (별도 레코드가 유리)
  - **기존 로직 재사용**: 현재 템플릿 매칭 로직에 `language` 필터만 추가하면 됨
  - **관리 편의성**: 관리자가 언어별로 템플릿을 독립적으로 관리 (활성화/비활성화 개별 적용)
  - **확장성**: 향후 언어별 통계 분리 가능 (영어 템플릿 사용률 vs 한국어)

- **트레이드오프**:
  - **포기한 것**: 단일 레코드로 모든 언어 관리하는 단순함 (2배 레코드 증가)
  - **얻은 것**: 언어별 독립 관리, 통계 분리, 키워드 최적화 가능
  - **마이그레이션**: 기존 템플릿에 `language: 'ko'` 기본값 설정 → 관리자가 점진적으로 영어 버전 추가

### 결정 7: 하위 호환성 보장 전략

- **선택지**:
  - A) 기존 코드 전면 수정 (모든 함수에 language 파라미터 추가)
  - B) language 기본값 'ko' 설정 + 기존 함수 시그니처 유지 (선택적 파라미터)
  - C) 새 함수 추가 (generateAnswerMultilingual) + 기존 함수 deprecate

- **결정**: **B) language 기본값 'ko' 설정 + 기존 함수 시그니처 유지**

- **근거**:
  - **점진적 마이그레이션**: 기존 F-02, F-03이 정상 작동 유지 (language 파라미터 없으면 'ko'로 작동)
  - **테스트 부담 감소**: 기존 테스트 코드 수정 최소화 (language 없어도 통과)
  - **API 호환성**: 기존 프론트엔드 코드가 language 파라미터 없이도 작동
  - **명확한 의도**: 한국어가 기본 언어임을 코드로 표현

- **트레이드오프**:
  - **포기한 것**: 명시적 언어 파라미터 강제 (타입 안전성 약간 감소)
  - **얻은 것**: 하위 호환성, 점진적 마이그레이션, 테스트 안정성
  - **구현 예시**: `generateAnswer(..., language: string = 'ko')`

---

## 3. API 설계

### 3.1. 기존 API 확장 (language 파라미터 추가)

#### PATCH /api/conversations/:id/language

- **목적**: 대화 세션의 언어를 수동으로 변경
- **인증**: 필요 (`requireAuth`)
- **권한**: 대화 소유자(userId 또는 sessionId 일치) 또는 admin
- **Request Body**:
  ```json
  {
    "language": "en"  // 'ko' 또는 'en' (enum 검증)
  }
  ```
- **Response (200)**:
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
- **에러 케이스**:
  | 코드 | 상황 | 응답 |
  |------|------|------|
  | 400 | language가 'ko'/'en'이 아닌 경우 | `{ success: false, error: "language는 'ko' 또는 'en'이어야 합니다" }` |
  | 403 | 대화 소유자가 아닌 경우 | `{ success: false, error: "대화에 접근할 권한이 없습니다" }` |
  | 404 | 대화가 존재하지 않는 경우 | `{ success: false, error: "대화를 찾을 수 없습니다" }` |

### 3.2. 기존 API 응답 수정 (language 필드 추가)

#### GET /api/conversations (대화 목록 조회)

- **Response 변경**:
  ```json
  {
    "success": true,
    "data": {
      "conversations": [
        {
          "id": "uuid-1234",
          "language": "ko",  // ← 추가
          "category": {
            "id": "uuid-cat-1",
            "name": "상품문의"  // ← language='ko'일 때 name_ko 반환
          },
          "lastMessageAt": "2026-02-12T09:00:00Z",
          "messageCount": 5
        }
      ],
      "pagination": { ... }
    }
  }
  ```

#### GET /api/conversations/:id (대화 상세 조회)

- **Response 변경**:
  ```json
  {
    "success": true,
    "data": {
      "conversation": {
        "id": "uuid-1234",
        "language": "en",  // ← 추가
        "category": {
          "id": "uuid-cat-1",
          "name": "Product Inquiry"  // ← language='en'일 때 name_en 반환
        },
        "needsEscalation": false,
        "createdAt": "2026-02-12T08:00:00Z"
      }
    }
  }
  ```

#### POST /api/chat (메시지 전송 및 답변 생성)

- **Request Body** (변경 없음 - 언어는 자동 감지):
  ```json
  {
    "conversationId": "uuid-1234",  // null이면 신규 대화 생성
    "message": "How long does shipping take?"
  }
  ```

- **Response 변경**:
  ```json
  {
    "success": true,
    "data": {
      "conversationId": "uuid-1234",
      "language": "en",  // ← 추가 (신규 대화 시 감지된 언어, 기존 대화 시 기존 언어)
      "userMessage": { ... },
      "assistantMessage": {
        "id": "uuid-msg-2",
        "content": "Shipping typically takes 2-3 business days.",  // ← 영어 답변
        "sender": "assistant",
        "createdAt": "2026-02-12T10:00:01Z"
      },
      "needsEscalation": false
    }
  }
  ```

### 3.3. 신규 API

#### GET /api/categories (카테고리 목록 조회)

- **목적**: 언어별 카테고리 이름 반환 (기존 API 확장)
- **인증**: 불필요 (public)
- **쿼리 파라미터**:
  - `language` (선택): 'ko' 또는 'en' (기본값: 'ko')
- **Request 예시**:
  ```
  GET /api/categories?language=en
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "categories": [
        { "id": "uuid-1", "name": "Product Inquiry", "slug": "product" },
        { "id": "uuid-2", "name": "Shipping Inquiry", "slug": "shipping" },
        { "id": "uuid-3", "name": "Return/Exchange", "slug": "return-exchange" },
        { "id": "uuid-4", "name": "Payment Inquiry", "slug": "payment" },
        { "id": "uuid-5", "name": "Other", "slug": "other" }
      ]
    }
  }
  ```

---

## 4. DB 설계

### 4.1. 신규 Enum

```prisma
// 지원 언어 Enum
enum Language {
  ko  // 한국어
  en  // 영어
}
```

### 4.2. 테이블 변경

#### conversation 테이블 (변경)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | String | PK, UUID | 기존 |
| language | Language | NOT NULL, DEFAULT 'ko' | **신규**: 대화 언어 ('ko' 또는 'en') |
| ... | ... | ... | 기존 컬럼 유지 |

**마이그레이션 전략**:
- 기존 레코드: `language = 'ko'` 기본값 설정 (하위 호환성)
- 신규 레코드: 첫 메시지에서 자동 감지된 언어 저장

**인덱스 추가**:
```prisma
@@index([language], name: "idx_conversation_language")
@@index([language, createdAt, deletedAt], name: "idx_conversation_language_analytics")
```
- **용도**: 언어별 대화 통계 쿼리 최적화 (예: "영어 고객 대화 수 월별 집계")

#### category 테이블 (변경)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | String | PK, UUID | 기존 |
| name | String | UNIQUE | **변경**: 기존 `name` → 한국어 이름으로 유지 (하위 호환성) |
| name_ko | String | NOT NULL, UNIQUE | **신규**: 한국어 카테고리 이름 |
| name_en | String | NOT NULL, UNIQUE | **신규**: 영어 카테고리 이름 |
| slug | String | UNIQUE | 기존 |
| ... | ... | ... | 기존 컬럼 유지 |

**마이그레이션 전략**:
1. `name_ko` 컬럼 추가 → 기존 `name` 값 복사
2. `name_en` 컬럼 추가 → 영어 번역 삽입 (시드 데이터)
3. 기존 `name` 컬럼 유지 (기존 API 호환용, 추후 deprecate 고려)

**시드 데이터**:
```typescript
const categoryTranslations = [
  { slug: 'product', name_ko: '상품문의', name_en: 'Product Inquiry' },
  { slug: 'shipping', name_ko: '배송문의', name_en: 'Shipping Inquiry' },
  { slug: 'return-exchange', name_ko: '반품/교환', name_en: 'Return/Exchange' },
  { slug: 'payment', name_ko: '결제문의', name_en: 'Payment Inquiry' },
  { slug: 'other', name_ko: '기타', name_en: 'Other' },
];
```

#### faq_template 테이블 (변경)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | String | PK, UUID | 기존 |
| language | Language | NOT NULL, DEFAULT 'ko' | **신규**: 템플릿 언어 ('ko' 또는 'en') |
| question | String | NOT NULL | **변경**: UNIQUE 제거 (언어별 중복 가능) |
| answer | String | TEXT | 기존 |
| ... | ... | ... | 기존 컬럼 유지 |

**마이그레이션 전략**:
- 기존 템플릿: `language = 'ko'` 기본값 설정
- 관리자가 점진적으로 영어 템플릿 추가 (같은 question의 영어 버전)

**인덱스 추가**:
```prisma
@@index([language, isActive], name: "idx_template_language_active")
@@index([categoryId, language], name: "idx_template_category_language")
```

**UNIQUE 제약 조건 변경**:
```prisma
@@unique([question, language], name: "unique_question_per_language")
```
- **이유**: 같은 질문이라도 한국어/영어로 각각 등록 가능

### 4.3. 마이그레이션 SQL 예시 (Prisma Migrate)

```sql
-- 1. Enum 추가
CREATE TYPE "Language" AS ENUM ('ko', 'en');

-- 2. conversation 테이블 변경
ALTER TABLE "conversation"
ADD COLUMN "language" "Language" NOT NULL DEFAULT 'ko';

CREATE INDEX "idx_conversation_language" ON "conversation"("language");
CREATE INDEX "idx_conversation_language_analytics" ON "conversation"("language", "created_at", "deleted_at");

-- 3. category 테이블 변경
ALTER TABLE "category"
ADD COLUMN "name_ko" TEXT NOT NULL DEFAULT '',
ADD COLUMN "name_en" TEXT NOT NULL DEFAULT '';

-- 기존 name 값을 name_ko에 복사
UPDATE "category" SET "name_ko" = "name";

-- 영어 번역 삽입 (시드 데이터)
UPDATE "category" SET "name_en" = 'Product Inquiry' WHERE "slug" = 'product';
UPDATE "category" SET "name_en" = 'Shipping Inquiry' WHERE "slug" = 'shipping';
UPDATE "category" SET "name_en" = 'Return/Exchange' WHERE "slug" = 'return-exchange';
UPDATE "category" SET "name_en" = 'Payment Inquiry' WHERE "slug" = 'payment';
UPDATE "category" SET "name_en" = 'Other' WHERE "slug" = 'other';

-- UNIQUE 제약조건 추가
ALTER TABLE "category"
ADD CONSTRAINT "category_name_ko_unique" UNIQUE ("name_ko"),
ADD CONSTRAINT "category_name_en_unique" UNIQUE ("name_en");

-- 4. faq_template 테이블 변경
ALTER TABLE "faq_template"
ADD COLUMN "language" "Language" NOT NULL DEFAULT 'ko';

-- 기존 UNIQUE 제약 제거
ALTER TABLE "faq_template"
DROP CONSTRAINT IF EXISTS "faq_template_question_unique";

-- 새 복합 UNIQUE 제약 추가
ALTER TABLE "faq_template"
ADD CONSTRAINT "faq_template_question_language_unique" UNIQUE ("question", "language");

CREATE INDEX "idx_template_language_active" ON "faq_template"("language", "is_active");
CREATE INDEX "idx_template_category_language" ON "faq_template"("category_id", "language");
```

---

## 5. 시퀀스 흐름

### 5.1. 주요 시나리오: 신규 대화 시작 (언어 자동 감지)

```
사용자 → Frontend → Backend API → Chat Service → Language Detect → OpenAI Service → DB
  │                    │              │                │                  │            │
  │  POST /api/chat    │              │                │                  │            │
  │  (message: "How    │              │                │                  │            │
  │   long does        │              │                │                  │            │
  │   shipping take?") │              │                │                  │            │
  │──────────────────▶│              │                │                  │            │
  │                    │  processMessage()             │                  │            │
  │                    │─────────────▶│                │                  │            │
  │                    │              │  conversationId == null            │            │
  │                    │              │  → 신규 대화                       │            │
  │                    │              │                │                  │            │
  │                    │              │  detectLanguage("How long...")    │            │
  │                    │              │────────────────▶│                  │            │
  │                    │              │  (franc library)                   │            │
  │                    │              │◀────────────────│                  │            │
  │                    │              │  language: 'en' (신뢰도: 0.95)    │            │
  │                    │              │                │                  │            │
  │                    │              │  createConversation(language='en')│            │
  │                    │              │──────────────────────────────────▶│            │
  │                    │              │◀──────────────────────────────────│            │
  │                    │              │  conversation.id, language='en'   │            │
  │                    │              │                │                  │            │
  │                    │              │  saveMessage(user, "How long...") │            │
  │                    │              │──────────────────────────────────▶│            │
  │                    │              │                │                  │            │
  │                    │              │  generateAnswer(..., language='en')           │
  │                    │              │──────────────────────────────────────────────▶│
  │                    │              │  (영어 시스템 프롬프트 사용)                  │
  │                    │              │◀──────────────────────────────────────────────│
  │                    │              │  "Shipping typically takes 2-3 business days."│
  │                    │              │                │                  │            │
  │                    │              │  saveMessage(assistant, "Shipping...")        │
  │                    │              │──────────────────────────────────▶│            │
  │                    │◀─────────────│                │                  │            │
  │  { success: true,  │              │                │                  │            │
  │    language: 'en', │              │                │                  │            │
  │    assistantMessage: "Shipping..." }               │                  │            │
  │◀──────────────────│              │                │                  │            │
```

**핵심 포인트**:
1. **신규 대화 판단**: `conversationId === null`
2. **언어 감지**: `franc` 라이브러리로 첫 메시지 언어 감지 (50ms 이하)
3. **대화 생성**: `conversation.language = 'en'` 저장
4. **프롬프트 선택**: 영어 시스템 프롬프트 사용 (`prompts.en.system`)
5. **답변 생성**: OpenAI API 호출 (영어 답변 생성)

### 5.2. 기존 대화 계속 (언어 재감지 없음)

```
사용자 → Frontend → Backend API → Chat Service → OpenAI Service → DB
  │                    │              │              │                │
  │  POST /api/chat    │              │              │                │
  │  (conversationId:  │              │              │                │
  │   "uuid-1234",     │              │              │                │
  │   message: "What   │              │              │                │
  │   about returns?") │              │              │                │
  │──────────────────▶│              │              │                │
  │                    │  processMessage()           │                │
  │                    │─────────────▶│              │                │
  │                    │              │  findConversation(uuid-1234)  │
  │                    │              │──────────────────────────────▶│
  │                    │              │◀──────────────────────────────│
  │                    │              │  conversation.language = 'en' │
  │                    │              │  (재감지 안 함, 기존 언어 사용)
  │                    │              │              │                │
  │                    │              │  generateAnswer(..., language='en')
  │                    │              │──────────────▶│                │
  │                    │              │  (영어 프롬프트 사용)           │
  │                    │              │◀──────────────│                │
  │                    │◀─────────────│              │                │
  │  { assistantMessage: "Returns are accepted..." } │                │
  │◀──────────────────│              │              │                │
```

**핵심 포인트**:
1. **기존 대화 조회**: `conversation.language = 'en'` 확인
2. **언어 재감지 생략**: 첫 메시지에서 감지한 언어 유지
3. **일관성 유지**: 대화 전체가 동일 언어로 진행

### 5.3. 언어 수동 변경

```
사용자 → Frontend → Backend API → Conversation Service → DB
  │                    │              │                     │
  │  언어 토글 클릭    │              │                     │
  │  (KO → EN)         │              │                     │
  │──────────────────▶│              │                     │
  │  PATCH /api/conversations/:id/language                │
  │  { language: 'en' }│              │                     │
  │──────────────────▶│              │                     │
  │                    │  updateLanguage()                 │
  │                    │─────────────▶│                     │
  │                    │              │  권한 검증          │
  │                    │              │  (userId 일치?)     │
  │                    │              │                     │
  │                    │              │  UPDATE conversation│
  │                    │              │  SET language='en'  │
  │                    │              │──────────────────▶│  │
  │                    │              │◀──────────────────│  │
  │                    │◀─────────────│                     │
  │  { success: true,  │              │                     │
  │    language: 'en' }│              │                     │
  │◀──────────────────│              │                     │
  │                    │              │                     │
  │  UI 언어 변경      │              │                     │
  │  (next-intl)       │              │                     │
  │  "메시지를 입력"   │              │                     │
  │  → "Enter message" │              │                     │
```

**핵심 포인트**:
1. **권한 검증**: 대화 소유자만 변경 가능
2. **DB 업데이트**: `conversation.language = 'en'`
3. **프론트엔드 동기화**: `next-intl`로 UI 텍스트 즉시 변경
4. **이후 메시지**: 변경된 언어로 답변 생성

### 5.4. 에러 시나리오: 언어 감지 실패 (폴백 언어)

```
사용자 → Frontend → Backend API → Chat Service → Language Detect
  │                    │              │              │
  │  POST /api/chat    │              │              │
  │  (message: "ㅎㅇ")  │              │              │  (짧은 메시지)
  │──────────────────▶│              │              │
  │                    │  processMessage()           │
  │                    │─────────────▶│              │
  │                    │              │  detectLanguage("ㅎㅇ")
  │                    │              │──────────────▶│
  │                    │              │  (franc 신뢰도: 0.3) ← 낮음!
  │                    │              │◀──────────────│
  │                    │              │  language: 'ko' (폴백)
  │                    │              │              │
  │                    │              │  createConversation(language='ko')
  │                    │              │  (한국어로 처리) │
```

**핵심 포인트**:
1. **신뢰도 임계값**: franc 신뢰도 < 0.5 시 폴백
2. **폴백 언어**: 한국어('ko')로 설정
3. **로깅**: 언어 감지 실패 로그 기록 (개선 참고용)

---

## 6. 영향 범위 분석

### 6.1. 수정 필요한 기존 파일

| 파일 경로 | 변경 내용 | 상세 |
|-----------|-----------|------|
| `backend/prisma/schema.prisma` | Language enum 추가, conversation/category/faq_template 스키마 변경 | Enum 정의, 컬럼 추가, 인덱스 추가 |
| `backend/src/services/openai.service.ts` | `generateAnswer()` 함수에 `language` 파라미터 추가 (기본값: 'ko') | 시스템 프롬프트를 언어별로 분리, 프롬프트 선택 로직 추가 |
| `backend/src/services/chat.service.ts` | 언어 감지 로직 추가, `generateAnswer()` 호출 시 language 전달 | 신규 대화 시 언어 감지, 기존 대화 시 language 조회 |
| `backend/src/services/conversation.service.ts` | 대화 조회 시 language 필드 포함, 언어 변경 함수 추가 | `getConversation()`, `updateLanguage()` 함수 추가 |
| `backend/src/services/template.service.ts` | 템플릿 매칭 시 language 필터 추가 | `matchTemplate(message, categoryId, language)` 파라미터 추가 |
| `backend/src/routes/conversation.routes.ts` | `PATCH /conversations/:id/language` 엔드포인트 추가 | 새 라우트 추가 |
| `backend/src/routes/category.routes.ts` | 카테고리 조회 시 language 파라미터로 name_ko/name_en 반환 | 기존 `GET /categories` 응답 수정 |
| `frontend/app/layout.tsx` | `next-intl` Provider 추가 | `<NextIntlClientProvider>` 래핑 |
| `frontend/components/chat/ChatWindow.tsx` | 언어 토글 UI 추가, 언어 변경 API 호출 | 언어 전환 버튼, API 호출 로직 |
| `frontend/lib/chat-api.ts` | `PATCH /conversations/:id/language` API 함수 추가 | `updateConversationLanguage()` 함수 추가 |
| `frontend/contexts/LanguageContext.tsx` | 언어 상태 관리 Context 추가 | 언어 전환, localStorage 저장 |

### 6.2. 새로 생성할 파일

| 파일 경로 | 역할 |
|-----------|------|
| `backend/src/lib/language-detector.ts` | franc 라이브러리 래핑, 언어 감지 함수 제공 |
| `backend/src/lib/prompts.ts` | 언어별 시스템 프롬프트 정의 (ko/en) |
| `backend/src/lib/i18n-messages.ts` | 백엔드 시스템 메시지 다국어 리소스 (에스컬레이션, 에러 메시지) |
| `backend/src/validators/language.validators.ts` | language 파라미터 검증 (Joi/Zod) |
| `backend/prisma/migrations/[timestamp]_add_multilingual_support/migration.sql` | 다국어 지원 DB 마이그레이션 |
| `frontend/messages/ko.json` | 프론트엔드 한국어 번역 리소스 |
| `frontend/messages/en.json` | 프론트엔드 영어 번역 리소스 |
| `frontend/i18n.ts` | `next-intl` 설정 파일 |
| `frontend/contexts/LanguageContext.tsx` | 언어 상태 관리 Context (전역) |
| `frontend/hooks/useLanguage.ts` | 언어 전환 커스텀 훅 |

### 6.3. 영향 받는 기존 기능

| 기능 ID | 기능명 | 영향 내용 | 하위 호환성 보장 방법 |
|---------|--------|-----------|---------------------|
| F-02 | 문의 자동 분류 | 카테고리 이름이 language에 따라 name_ko/name_en 반환 | `category.name`은 유지 (name_ko와 동일), 기본값 'ko' |
| F-03 | 자동 답변 | `generateAnswer()` 함수에 language 파라미터 추가 | 기본값 'ko' 설정으로 기존 호출 유지 |
| F-04 | 대화 이력 | 대화 조회 시 language 필드 추가 | 기존 응답에 필드 추가만 (breaking change 없음) |
| F-07 | 템플릿 관리 | 템플릿 매칭 시 language 필터 추가 | 기존 템플릿 `language='ko'` 기본값으로 정상 작동 |
| F-08 | 관리자 대시보드 | 언어별 통계 추가 (선택) | 기존 통계는 전체 언어 합계로 유지 |

---

## 7. 구현 세부사항

### 7.1. 언어 감지 로직 (backend/src/lib/language-detector.ts)

```typescript
import { franc } from 'franc';

export type SupportedLanguage = 'ko' | 'en';

interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
}

const CONFIDENCE_THRESHOLD = 0.5;
const FALLBACK_LANGUAGE: SupportedLanguage = 'ko';

/**
 * 텍스트의 언어를 자동 감지
 * @param text 감지할 텍스트
 * @returns 감지된 언어 ('ko' 또는 'en')
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  // 짧은 메시지는 감지 어려움 → 폴백
  if (text.length < 5) {
    return {
      language: FALLBACK_LANGUAGE,
      confidence: 0,
    };
  }

  // franc 라이브러리로 언어 감지 (ISO 639-3 코드 반환)
  const detectedCode = franc(text, { only: ['kor', 'eng'] });

  // 코드 변환: kor → ko, eng → en
  const languageMap: Record<string, SupportedLanguage> = {
    kor: 'ko',
    eng: 'en',
  };

  const language = languageMap[detectedCode] || FALLBACK_LANGUAGE;

  // 신뢰도 계산 (franc-min 사용 시 신뢰도 점수 제공, franc는 제공 안 함)
  // 대안: franc-all로 여러 후보 비교하여 신뢰도 추정
  const confidence = detectedCode === 'und' ? 0 : 0.9; // 'und' = undefined

  return {
    language: confidence >= CONFIDENCE_THRESHOLD ? language : FALLBACK_LANGUAGE,
    confidence,
  };
}
```

**핵심 포인트**:
- franc 라이브러리는 ISO 639-3 코드 반환 (kor, eng) → 'ko', 'en'으로 변환
- 짧은 메시지(5자 미만)는 감지 불가 → 폴백 언어 반환
- 신뢰도 임계값(0.5) 미만 시 폴백

### 7.2. 언어별 프롬프트 (backend/src/lib/prompts.ts)

```typescript
export interface SystemPrompt {
  classification: string;  // F-02 분류용
  answer: string;          // F-03 답변용
  escalation: string;      // 에스컬레이션 메시지
  fallback: string;        // AI 오류 시 폴백 메시지
}

export const prompts: Record<'ko' | 'en', SystemPrompt> = {
  ko: {
    classification: `당신은 고객 문의를 카테고리로 분류하는 전문가입니다.
문의 내용을 분석하여 가장 적절한 카테고리를 선택하세요.

카테고리:
- 상품문의: 제품 정보, 재고, 사양 문의
- 배송문의: 배송 기간, 추적, 지연 문의
- 반품/교환: 환불, 취소, 교환 요청
- 결제문의: 결제 오류, 카드 승인, 영수증
- 기타: 위에 해당하지 않는 문의

상담원 연결이 필요한 경우:
- 개인정보(주문번호, 결제 정보) 조회 필요
- 환불, 취소 등 처리 권한 필요
- 심각한 불만 사항`,

    answer: `당신은 친절한 고객 상담 챗봇입니다. 고객의 문의에 정확하고 도움이 되는 답변을 제공하세요.

답변 시 다음을 지켜주세요:
- 친근하고 전문적인 톤 유지
- 간결하고 명확한 문장 (최대 300자 권장)
- 필요 시 단계별 안내 제공

다음과 같은 경우 반드시 "상담원 연결이 필요합니다"라고 답변하세요:
- 개인정보(주문번호, 결제 정보) 조회가 필요한 경우
- 환불, 취소, 교환 등 처리 권한이 필요한 경우
- 복잡한 기술 문제나 불만 사항`,

    escalation: '이 문의는 상담원 연결이 필요합니다. 잠시만 기다려 주시면 담당자가 확인 후 연락드리겠습니다.',

    fallback: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주시거나, 긴급한 경우 상담원 연결을 요청해주세요.',
  },

  en: {
    classification: `You are an expert at categorizing customer inquiries.
Analyze the inquiry and select the most appropriate category.

Categories:
- Product Inquiry: Product information, stock, specifications
- Shipping Inquiry: Delivery time, tracking, delays
- Return/Exchange: Refunds, cancellations, exchanges
- Payment Inquiry: Payment errors, card approval, receipts
- Other: Inquiries that don't fit above categories

Cases requiring agent escalation:
- Personal information lookup needed (order number, payment info)
- Processing authority required (refunds, cancellations)
- Serious complaints or complex issues`,

    answer: `You are a friendly customer service chatbot. Provide accurate and helpful responses to customer inquiries.

Response guidelines:
- Maintain a friendly and professional tone
- Keep responses concise and clear (max 300 characters recommended)
- Provide step-by-step guidance when needed

Always respond "This inquiry requires an agent" in the following cases:
- Personal information lookup needed (order number, payment info)
- Processing authority required (refunds, cancellations, exchanges)
- Complex technical issues or complaints`,

    escalation: 'This inquiry requires an agent. Please wait, and a representative will contact you shortly.',

    fallback: 'We apologize for the inconvenience. A temporary error occurred. Please try again later, or request agent assistance for urgent matters.',
  },
};
```

**핵심 포인트**:
- 시스템 프롬프트를 언어별로 완전히 분리
- 한국어는 존댓말 톤, 영어는 친근한 you 톤
- 에스컬레이션 메시지도 언어별로 분리

### 7.3. openai.service.ts 수정 (하위 호환성 유지)

```typescript
// 기존 함수 시그니처 확장 (기본값으로 하위 호환성 보장)
export async function generateAnswer(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentMessage: string,
  categoryName?: string,
  language: 'ko' | 'en' = 'ko'  // ← 기본값 추가 (하위 호환성)
): Promise<{ content: string; needsEscalation: boolean }> {
  // 언어별 시스템 프롬프트 선택
  const systemPrompt = prompts[language].answer;

  // 카테고리 정보 추가 (언어별로 번역된 카테고리 이름 사용)
  let finalPrompt = systemPrompt;
  if (categoryName) {
    finalPrompt += language === 'ko'
      ? `\n\n이 문의는 "${categoryName}" 카테고리로 분류되었습니다. 이를 참고하여 답변하세요.`
      : `\n\nThis inquiry has been categorized as "${categoryName}". Use this information in your response.`;
  }

  // 메시지 배열 구성
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: finalPrompt },
    ...conversationHistory.map(
      (msg) =>
        ({
          role: msg.role,
          content: msg.content,
        } as OpenAI.Chat.ChatCompletionMessageParam)
    ),
    { role: 'user', content: currentMessage },
  ];

  // OpenAI API 호출 (기존 로직 유지)
  const completion = await createChatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 500,
    timeout: 30000,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('OpenAI 응답이 비어있습니다');
  }

  // 언어별 에스컬레이션 문구 감지
  const escalationKeywords = {
    ko: '상담원 연결이 필요합니다',
    en: 'requires an agent',
  };
  const needsEscalation = responseContent.includes(escalationKeywords[language]);

  return {
    content: responseContent,
    needsEscalation,
  };
}
```

**하위 호환성 검증**:
- 기존 호출 `generateAnswer(history, message, category)` → language='ko'로 작동 ✅
- 새 호출 `generateAnswer(history, message, category, 'en')` → language='en'로 작동 ✅

### 7.4. chat.service.ts 수정 (언어 감지 추가)

```typescript
async processMessage(request: ChatRequest): Promise<ChatResponse> {
  const { conversationId, message, userId, sessionId } = request;

  // ... (기존 검증 로직)

  let conversation;
  let detectedLanguage: 'ko' | 'en' = 'ko';

  if (conversationId) {
    // 기존 대화 조회
    conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { category: true },
    });

    // ... (기존 권한 검증)

    // 기존 대화의 언어 사용 (재감지 안 함)
    detectedLanguage = conversation.language || 'ko';
  } else {
    // 신규 대화 → 언어 감지
    const { language, confidence } = detectLanguage(message);
    detectedLanguage = language;

    logger.info(`언어 감지: ${language} (신뢰도: ${confidence})`);

    // 신규 대화 생성
    conversation = await prisma.conversation.create({
      data: {
        userId: userId || null,
        sessionId: sessionId || null,
        language: detectedLanguage,  // ← 감지된 언어 저장
      },
      include: { category: true },
    });
    logger.info(`신규 대화 생성: ${conversation.id} (언어: ${detectedLanguage})`);
  }

  // ... (메시지 저장, 템플릿 매칭)

  // OpenAI 답변 생성 시 언어 전달
  const result = await generateAnswer(
    conversationHistory,
    message,
    conversation.category?.name_ko || conversation.category?.name_en,  // ← 카테고리 이름 (언어별)
    detectedLanguage  // ← 언어 전달
  );

  // ... (나머지 로직)

  return {
    conversationId: conversation.id,
    language: detectedLanguage,  // ← 응답에 language 포함
    userMessage: { ... },
    assistantMessage: { ... },
    needsEscalation,
  };
}
```

### 7.5. conversation.service.ts 수정 (언어 변경 API)

```typescript
/**
 * 대화 언어 수동 변경
 */
async updateLanguage(
  conversationId: string,
  language: 'ko' | 'en',
  userId: string | null,
  sessionId: string | null,
  isAdmin: boolean
): Promise<{ conversationId: string; language: string; updatedAt: Date }> {
  // 1. 대화 조회
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(404, '대화를 찾을 수 없습니다');
  }

  // 2. 권한 검증 (소유자 또는 admin만 변경 가능)
  if (!isAdmin) {
    if (
      (userId && conversation.userId !== userId) ||
      (sessionId && conversation.sessionId !== sessionId)
    ) {
      throw new AppError(403, '대화에 접근할 권한이 없습니다');
    }
  }

  // 3. 언어 업데이트
  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { language },
  });

  logger.info(`대화 언어 변경: ${conversationId} → ${language}`);

  return {
    conversationId: updated.id,
    language: updated.language,
    updatedAt: updated.updatedAt,
  };
}
```

### 7.6. 카테고리 조회 시 언어별 이름 반환

```typescript
// category.routes.ts
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language = 'ko' } = req.query;

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        name_ko: true,
        name_en: true,
      },
    });

    // 언어에 맞는 이름 반환
    const result = categories.map(cat => ({
      id: cat.id,
      slug: cat.slug,
      name: language === 'en' ? cat.name_en : cat.name_ko,
    }));

    res.status(200).json({ success: true, data: { categories: result } });
  } catch (error) {
    next(error);
  }
});
```

### 7.7. 프론트엔드 next-intl 설정 (frontend/i18n.ts)

```typescript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

**frontend/messages/ko.json**:
```json
{
  "chat": {
    "inputPlaceholder": "메시지를 입력하세요",
    "sendButton": "전송",
    "loadingMessage": "답변 생성 중...",
    "contactAgent": "상담원 연결",
    "languageToggle": "언어 변경"
  },
  "errors": {
    "networkError": "네트워크 오류가 발생했습니다",
    "authRequired": "로그인이 필요합니다"
  }
}
```

**frontend/messages/en.json**:
```json
{
  "chat": {
    "inputPlaceholder": "Enter your message",
    "sendButton": "Send",
    "loadingMessage": "Generating response...",
    "contactAgent": "Contact Agent",
    "languageToggle": "Change Language"
  },
  "errors": {
    "networkError": "A network error occurred",
    "authRequired": "Login required"
  }
}
```

---

## 8. 기술적 주의사항

### 보안
- **언어 파라미터 검증**: `language`는 반드시 enum('ko', 'en')만 허용, Joi/Zod로 검증
- **XSS 방지**: 다국어 메시지도 기존 sanitization 로직 동일 적용 (DOMPurify 등)
- **API 키 보호**: OpenAI API 키는 환경변수로 관리 (클라이언트 노출 금지)

### 성능
- **언어 감지 최적화**: franc 라이브러리는 동기 함수이므로 메인 스레드 블로킹 주의 → 짧은 메시지는 조기 폴백
- **캐싱**: 언어별 프롬프트를 메모리에 캐싱 (매 요청마다 파일 읽지 않음)
- **인덱스 활용**: `conversation.language` 인덱스로 언어별 통계 쿼리 최적화

### 데이터 정합성
- **마이그레이션 안전성**: 기존 레코드에 `language = 'ko'` 기본값 설정 후 NOT NULL 제약 추가
- **카테고리 번역 완전성**: 모든 카테고리에 name_ko, name_en이 반드시 존재하도록 시드 데이터 검증

### 에러 핸들링
- **언어 감지 실패**: 폴백 언어('ko')로 처리 + 로깅
- **OpenAI API 오류**: 기존 재시도 로직 유지, 실패 시 시스템 메시지를 언어별로 반환
- **번역 리소스 누락**: next-intl fallback locale 설정 (en → ko)

### 테스트 전략
- **언어 감지 단위 테스트**: `detectLanguage()` 함수의 한국어/영어/짧은 메시지 시나리오
- **통합 테스트**: 신규 대화 시작 → 언어 감지 → 답변 생성 전체 플로우
- **회귀 테스트**: 기존 한국어 전용 기능(F-02, F-03)이 정상 작동하는지 검증
- **E2E 테스트**: Playwright로 언어 토글 버튼 클릭 → UI 변경 → 새 메시지 전송 → 영어 답변 확인

---

## 9. 변경 이력

| 날짜 | 변경 내용 | 이유 |
|------|-----------|------|
| 2026-02-12 | 최초 작성 | F-10 기술 설계 시작 |

---

## 10. 다음 단계

1. **product-manager**:
   - `docs/specs/multilingual-support/plan.md` 작성
   - 구현 태스크 분해 (DB 마이그레이션 → 백엔드 → 프론트엔드 → 테스트)
   - 단독 실행 계획 (openai.service.ts 충돌 회피)

2. **backend-dev**:
   - DB 마이그레이션 작성 및 실행
   - `language-detector.ts`, `prompts.ts` 구현
   - `openai.service.ts`, `chat.service.ts`, `conversation.service.ts` 수정
   - API 엔드포인트 추가 (`PATCH /conversations/:id/language`)
   - 단위 테스트 작성

3. **frontend-dev**:
   - `next-intl` 설정 및 번역 리소스 작성
   - 언어 토글 UI 구현
   - API 연동 (`updateConversationLanguage`)
   - Context API로 언어 상태 관리

4. **test-runner**:
   - 언어 감지 테스트
   - 다국어 답변 생성 테스트
   - 회귀 테스트 (기존 한국어 기능)

5. **code-reviewer**:
   - 하위 호환성 검증
   - 성능 영향 검토
   - 설계↔구현 일치 확인

6. **doc-writer**:
   - API 스펙 확정본 작성 (`docs/api/multilingual-support.md`)
   - DB 스키마 설계서 작성 (`docs/db/multilingual-support.md`)
   - 진행 로그 + CHANGELOG 업데이트
