# 다국어 지원 (F-10) DB 스키마 — 확정본

> 설계 문서: `docs/specs/multilingual-support/design.md`
> 이 문서는 실제 구현 결과를 반영한 확정본입니다.

## 개요

F-10 다국어 지원을 위해 추가/수정된 DB 스키마입니다. 한국어와 영어 두 가지 언어를 지원하며, 향후 추가 언어 확장이 가능하도록 설계되었습니다.

## 1. 신규 Enum

### Language

지원하는 언어 목록

| 값 | 설명 |
|----|------|
| `ko` | 한국어 |
| `en` | 영어 |

**Prisma 정의**:
```prisma
enum Language {
  ko  // 한국어
  en  // 영어
}
```

**SQL 정의**:
```sql
CREATE TYPE "Language" AS ENUM ('ko', 'en');
```

---

## 2. 테이블 변경

### 2.1. conversation 테이블

대화 세션의 언어 정보를 저장합니다.

#### 신규 컬럼

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|----------|--------|------|
| language | Language | NOT NULL | `'ko'` | 대화 언어 ('ko' 또는 'en') |

#### 인덱스 추가

| 인덱스명 | 컬럼 | 용도 |
|----------|------|------|
| `idx_conversation_language` | `language` | 언어별 대화 조회 |
| `idx_conversation_language_analytics` | `language, created_at, deleted_at` | 언어별 통계 쿼리 최적화 |

#### Prisma 정의

```prisma
model Conversation {
  // ... 기존 필드 생략 ...

  // F-10: 다국어 지원
  language Language @default(ko)

  // ... 기존 인덱스 생략 ...

  // F-10 신규 인덱스
  @@index([language], name: "idx_conversation_language")
  @@index([language, createdAt, deletedAt], name: "idx_conversation_language_analytics")

  @@map("conversation")
}
```

#### 마이그레이션 SQL

```sql
-- language 컬럼 추가
ALTER TABLE "conversation" ADD COLUMN "language" "Language" NOT NULL DEFAULT 'ko';

-- 인덱스 생성
CREATE INDEX "idx_conversation_language" ON "conversation"("language");
CREATE INDEX "idx_conversation_language_analytics" ON "conversation"("language", "created_at", "deleted_at");
```

---

### 2.2. category 테이블

카테고리 이름의 다국어 버전을 저장합니다.

#### 신규 컬럼

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|----------|--------|------|
| name_ko | TEXT | NOT NULL, UNIQUE | - | 한국어 카테고리 이름 |
| name_en | TEXT | NOT NULL, UNIQUE | - | 영어 카테고리 이름 |

#### 기존 컬럼 유지

| 컬럼 | 타입 | 설명 | 비고 |
|------|------|------|------|
| name | TEXT | 기존 이름 (한국어) | 하위 호환성 유지, 추후 deprecate 예정 |

#### Prisma 정의

```prisma
model Category {
  id String @id @default(uuid())
  name String @unique // 하위 호환성 유지
  nameKo String @unique @map("name_ko") // F-10: 한국어 이름
  nameEn String @unique @map("name_en") // F-10: 영어 이름
  slug String @unique
  // ... 기타 필드 생략 ...

  @@map("category")
}
```

#### 마이그레이션 SQL

```sql
-- 컬럼 추가 (임시 NULL 허용)
ALTER TABLE "category" ADD COLUMN "name_ko" TEXT;
ALTER TABLE "category" ADD COLUMN "name_en" TEXT;

-- 기존 데이터 마이그레이션 (name → name_ko)
UPDATE "category" SET "name_ko" = "name" WHERE "name_ko" IS NULL;

-- 영어 번역 삽입
UPDATE "category" SET "name_en" = 'Product Inquiry' WHERE "slug" = 'product-inquiry' OR "slug" = 'product';
UPDATE "category" SET "name_en" = 'Shipping Inquiry' WHERE "slug" = 'shipping-inquiry' OR "slug" = 'shipping';
UPDATE "category" SET "name_en" = 'Return/Exchange' WHERE "slug" = 'return-exchange';
UPDATE "category" SET "name_en" = 'Payment Inquiry' WHERE "slug" = 'payment-inquiry' OR "slug" = 'payment';
UPDATE "category" SET "name_en" = 'Other' WHERE "slug" = 'other';

-- 나머지 레코드 처리 (기존 name 복사)
UPDATE "category" SET "name_en" = "name" WHERE "name_en" IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE "category" ALTER COLUMN "name_ko" SET NOT NULL;
ALTER TABLE "category" ALTER COLUMN "name_en" SET NOT NULL;

-- UNIQUE 제약 추가
ALTER TABLE "category" ADD CONSTRAINT "category_name_ko_key" UNIQUE ("name_ko");
ALTER TABLE "category" ADD CONSTRAINT "category_name_en_key" UNIQUE ("name_en");
```

#### 시드 데이터 (카테고리 영어 번역)

| slug | name_ko | name_en |
|------|---------|---------|
| product-inquiry | 상품문의 | Product Inquiry |
| shipping-inquiry | 배송문의 | Shipping Inquiry |
| return-exchange | 반품/교환 | Return/Exchange |
| payment-inquiry | 결제문의 | Payment Inquiry |
| other | 기타 | Other |

---

### 2.3. faq_template 테이블

템플릿의 언어를 지정하여 언어별로 별도 관리합니다.

#### 신규 컬럼

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|----------|--------|------|
| language | Language | NOT NULL | `'ko'` | 템플릿 언어 ('ko' 또는 'en') |

#### UNIQUE 제약 변경

- **기존**: `question` 단독 UNIQUE
- **변경**: `(question, language)` 복합 UNIQUE
- **이유**: 같은 질문이라도 언어별로 별도 템플릿 등록 가능

#### 인덱스 추가

| 인덱스명 | 컬럼 | 용도 |
|----------|------|------|
| `idx_template_language_active` | `language, is_active` | 언어별 활성 템플릿 조회 |
| `idx_template_category_language` | `category_id, language` | 카테고리+언어 필터 조회 |

#### Prisma 정의

```prisma
model FaqTemplate {
  // ... 기존 필드 생략 ...

  // F-10: 다국어 지원
  language Language @default(ko)

  // ... 기존 인덱스 생략 ...

  // F-10 신규 인덱스
  @@index([language, isActive], name: "idx_template_language_active")
  @@index([categoryId, language], name: "idx_template_category_language")

  // F-10: 복합 UNIQUE 제약
  @@unique([question, language], name: "unique_question_per_language")

  @@map("faq_template")
}
```

#### 마이그레이션 SQL

```sql
-- language 컬럼 추가
ALTER TABLE "faq_template" ADD COLUMN "language" "Language" NOT NULL DEFAULT 'ko';

-- 기존 UNIQUE 제약 제거
ALTER TABLE "faq_template" DROP CONSTRAINT IF EXISTS "faq_template_question_key";

-- 복합 UNIQUE 제약 추가
ALTER TABLE "faq_template" ADD CONSTRAINT "unique_question_per_language" UNIQUE ("question", "language");

-- 인덱스 생성
CREATE INDEX "idx_template_language_active" ON "faq_template"("language", "is_active");
CREATE INDEX "idx_template_category_language" ON "faq_template"("category_id", "language");
```

---

## 3. 마이그레이션 정보

### 마이그레이션 파일명
`20260212150000_add_multilingual_support`

### 실행 순서
1. Language Enum 생성
2. conversation.language 컬럼 추가 + 인덱스
3. category.name_ko, name_en 컬럼 추가
4. category 데이터 마이그레이션 (name → name_ko, 영어 번역 삽입)
5. category UNIQUE 제약 추가
6. faq_template.language 컬럼 추가
7. faq_template UNIQUE 제약 변경 + 인덱스

### 롤백 전략
```sql
-- 인덱스 제거
DROP INDEX IF EXISTS "idx_conversation_language";
DROP INDEX IF EXISTS "idx_conversation_language_analytics";
DROP INDEX IF EXISTS "idx_template_language_active";
DROP INDEX IF EXISTS "idx_template_category_language";

-- 제약조건 제거
ALTER TABLE "faq_template" DROP CONSTRAINT IF EXISTS "unique_question_per_language";
ALTER TABLE "category" DROP CONSTRAINT IF EXISTS "category_name_ko_key";
ALTER TABLE "category" DROP CONSTRAINT IF EXISTS "category_name_en_key";

-- 컬럼 제거
ALTER TABLE "conversation" DROP COLUMN IF EXISTS "language";
ALTER TABLE "category" DROP COLUMN IF EXISTS "name_ko";
ALTER TABLE "category" DROP COLUMN IF EXISTS "name_en";
ALTER TABLE "faq_template" DROP COLUMN IF EXISTS "language";

-- faq_template UNIQUE 복원
ALTER TABLE "faq_template" ADD CONSTRAINT "faq_template_question_key" UNIQUE ("question");

-- Enum 제거
DROP TYPE IF EXISTS "Language";
```

---

## 4. 쿼리 패턴

### 4.1. 신규 대화 생성 시 언어 저장

```sql
INSERT INTO "conversation" (id, user_id, session_id, language, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW());
```

**Prisma**:
```typescript
await prisma.conversation.create({
  data: {
    userId,
    sessionId,
    language: detectedLanguage, // 'ko' 또는 'en'
  },
});
```

### 4.2. 언어별 카테고리 조회

```sql
SELECT id, slug,
  CASE WHEN $1 = 'en' THEN name_en ELSE name_ko END AS name
FROM "category"
WHERE is_active = true
ORDER BY created_at ASC;
```

**Prisma**:
```typescript
const categories = await prisma.category.findMany({
  where: { isActive: true },
  select: { id: true, slug: true, nameKo: true, nameEn: true },
});

// 언어에 맞는 이름 선택
const result = categories.map((cat) => ({
  id: cat.id,
  slug: cat.slug,
  name: language === 'en' ? cat.nameEn : cat.nameKo,
}));
```

### 4.3. 언어별 템플릿 조회

```sql
SELECT id, question, answer, keywords, priority
FROM "faq_template"
WHERE is_active = true
  AND deleted_at IS NULL
  AND language = $1
ORDER BY priority DESC;
```

**Prisma**:
```typescript
await prisma.faqTemplate.findMany({
  where: {
    isActive: true,
    deletedAt: null,
    language: language, // 'ko' 또는 'en'
  },
  orderBy: { priority: 'desc' },
});
```

### 4.4. 언어별 대화 통계 (관리자 대시보드)

```sql
SELECT language, COUNT(*) AS total
FROM "conversation"
WHERE deleted_at IS NULL
  AND created_at BETWEEN $1 AND $2
GROUP BY language;
```

**Prisma**:
```typescript
await prisma.conversation.groupBy({
  by: ['language'],
  where: {
    deletedAt: null,
    createdAt: { gte: startDate, lte: endDate },
  },
  _count: { id: true },
});
```

---

## 5. 성능 최적화

### 인덱스 활용 시나리오

| 인덱스 | 쿼리 시나리오 | 성능 효과 |
|--------|--------------|-----------|
| `idx_conversation_language` | 언어별 대화 필터 | O(log n) 조회 |
| `idx_conversation_language_analytics` | 언어별 월별 통계 | 복합 인덱스로 정렬 + 필터 최적화 |
| `idx_template_language_active` | 활성 템플릿 조회 | 언어 + 활성화 필터 최적화 |
| `idx_template_category_language` | 카테고리별 템플릿 매칭 | 카테고리 + 언어 복합 필터 최적화 |

### 예상 성능

- **언어별 대화 조회**: < 10ms (인덱스 사용)
- **템플릿 매칭**: < 50ms (언어 필터 추가로 검색 범위 50% 감소)
- **카테고리 조회**: < 5ms (UNIQUE 제약으로 빠른 조회)

---

## 6. 데이터 정합성

### 제약조건

1. **conversation.language**: NOT NULL, DEFAULT 'ko'
   - 모든 대화는 반드시 언어가 지정됨
   - 기본값 'ko'로 하위 호환성 보장

2. **category.name_ko, name_en**: NOT NULL, UNIQUE
   - 모든 카테고리는 한국어/영어 이름 필수
   - 중복 방지로 데이터 일관성 보장

3. **faq_template.question + language**: UNIQUE
   - 같은 질문이라도 언어별로 별도 등록 가능
   - 언어별 독립 관리

### 마이그레이션 안전성

- **기존 레코드**: `language = 'ko'` 기본값으로 자동 설정
- **NULL 방지**: 마이그레이션 단계에서 NOT NULL 제약 추가 전 데이터 검증
- **롤백 가능**: 모든 변경사항 롤백 SQL 제공

---

## 7. 설계 대비 변경사항

### 1. category.name 컬럼 유지
- **설계**: `name` 컬럼 제거 계획
- **구현**: `name` 컬럼 유지 (하위 호환성)
- **이유**: 기존 API가 `name` 필드를 참조 중
- **향후 계획**: 추후 버전에서 deprecate 예정

### 2. 마이그레이션 방식
- **설계**: Prisma Migrate 자동 생성
- **구현**: 수동 마이그레이션 SQL 작성
- **이유**: 기존 데이터 마이그레이션 로직 정교화 필요
- **장점**: 데이터 손실 방지, 정확한 제어

---

## 8. 향후 확장 계획

### 언어 추가 (일본어, 중국어)

1. **Enum 확장**:
   ```sql
   ALTER TYPE "Language" ADD VALUE 'ja';
   ALTER TYPE "Language" ADD VALUE 'zh';
   ```

2. **카테고리 컬럼 추가**:
   ```sql
   ALTER TABLE "category" ADD COLUMN "name_ja" TEXT;
   ALTER TABLE "category" ADD COLUMN "name_zh" TEXT;
   ```

3. **기존 인덱스**: 추가 인덱스 불필요 (기존 인덱스로 커버 가능)

### 번역 이력 테이블 (선택적)

향후 자동 번역 기능 추가 시:

```sql
CREATE TABLE "translation_cache" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_language "Language" NOT NULL,
  target_language "Language" NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (source_language, target_language, source_text)
);

CREATE INDEX "idx_translation_source" ON "translation_cache"(source_language, target_language);
```

---

## 9. 참고 문서

- 설계 문서: `docs/specs/multilingual-support/design.md`
- 계획 문서: `docs/specs/multilingual-support/plan.md`
- API 스펙: `docs/api/multilingual-support.md`
- 마이그레이션 파일: `backend/prisma/migrations/20260212150000_add_multilingual_support/migration.sql`
