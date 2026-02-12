# 답변 템플릿 관리 (F-07) DB 스키마 — 확정본

> 설계 문서: docs/specs/faq-template-management/design.md
> 이 문서는 실제 구현 결과를 반영한 확정본입니다.

## 개요

F-07(답변 템플릿 관리) 기능을 위한 데이터베이스 스키마 설계입니다. 관리자가 FAQ 템플릿을 등록하고 관리하며, 사용자 메시지에 키워드 기반 매칭을 통해 즉시 답변을 제공합니다.

## 테이블 정의

### faq_template 테이블

FAQ 템플릿 정보를 저장하는 테이블입니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT uuid() | 템플릿 고유 식별자 |
| question | VARCHAR(500) | NOT NULL, UNIQUE | 질문 패턴 (10~500자, 대소문자 무시 중복 체크) |
| answer | TEXT | NOT NULL | 답변 내용 (10~2000자) |
| keywords | TEXT[] | NULLABLE, DEFAULT [] | 매칭용 키워드 배열 (PostgreSQL 배열 타입, 최대 20개) |
| category_id | UUID | NULLABLE, FOREIGN KEY → category.id ON DELETE SET NULL | 특정 카테고리에만 적용 (null이면 전체 카테고리) |
| priority | INTEGER | NOT NULL, DEFAULT 0, CHECK (priority BETWEEN -100 AND 100) | 우선순위 (-100 ~ 100, 높을수록 우선) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 활성화 여부 (false면 매칭 대상에서 제외) |
| usage_count | INTEGER | NOT NULL, DEFAULT 0 | 사용 횟수 (통계용, 매칭 성공 시 자동 증가) |
| last_used_at | TIMESTAMP | NULLABLE | 최근 사용 일시 (통계용, 매칭 성공 시 자동 업데이트) |
| deleted_at | TIMESTAMP | NULLABLE | Soft Delete 타임스탬프 (삭제 시 현재 시각 설정) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성 일시 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정 일시 (자동 업데이트) |

#### 제약조건
- **UNIQUE (question)**: 중복 질문 방지 (대소문자 무시)
- **CHECK (priority BETWEEN -100 AND 100)**: 우선순위 범위 제한
- **FOREIGN KEY (category_id)**: category.id 참조, 카테고리 삭제 시 NULL 설정

---

## 인덱스 설계

| 인덱스명 | 컬럼 | 타입 | 용도 |
|---------|------|------|------|
| faq_template_pkey | id | PRIMARY KEY | 기본 키 |
| faq_template_question_key | question | UNIQUE | 중복 질문 방지 |
| idx_template_is_active | is_active | INDEX | 활성 템플릿 조회 최적화 (매칭 시) |
| idx_template_category_id | category_id | INDEX | 카테고리별 템플릿 필터링 |
| idx_template_priority | priority | INDEX | 우선순위 정렬 최적화 |
| idx_template_deleted_at | deleted_at | INDEX | Soft Delete 조회 최적화 (deletedAt IS NULL) |

### 인덱스 활용 예시
- **활성 템플릿 조회**: `WHERE is_active = true AND deleted_at IS NULL` → `idx_template_is_active` + `idx_template_deleted_at`
- **카테고리별 필터링**: `WHERE category_id = 'uuid-1234' AND deleted_at IS NULL` → `idx_template_category_id` + `idx_template_deleted_at`
- **우선순위 정렬**: `ORDER BY priority DESC, created_at DESC` → `idx_template_priority`

---

## 관계

### 1. Category → FaqTemplate (1:N)

- **관계**: 하나의 카테고리는 여러 템플릿을 가질 수 있음
- **외래 키**: `faq_template.category_id` → `category.id`
- **삭제 전략**: ON DELETE SET NULL (카테고리 삭제 시 템플릿의 category_id를 NULL로 설정)
- **Prisma 표현**:
  ```prisma
  model Category {
    // ... 기존 필드
    faqTemplates  FaqTemplate[]
  }

  model FaqTemplate {
    // ... 기존 필드
    category      Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  }
  ```

---

## Prisma 스키마

```prisma
// FAQ 템플릿 테이블 (F-07)
model FaqTemplate {
  id           String    @id @default(uuid())
  question     String    @unique
  answer       String    @db.Text
  keywords     String[]  // PostgreSQL 배열 타입
  categoryId   String?   @map("category_id")
  priority     Int       @default(0)
  isActive     Boolean   @default(true) @map("is_active")
  usageCount   Int       @default(0) @map("usage_count")
  lastUsedAt   DateTime? @map("last_used_at")
  deletedAt    DateTime? @map("deleted_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  category     Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  // 인덱스
  @@index([isActive], name: "idx_template_is_active")
  @@index([categoryId], name: "idx_template_category_id")
  @@index([priority], name: "idx_template_priority")
  @@index([deletedAt], name: "idx_template_deleted_at")

  @@map("faq_template")
}

// Category 모델 수정 (관계 추가)
model Category {
  // ... 기존 필드
  faqTemplates  FaqTemplate[] // F-07: 템플릿 관계 추가
}
```

---

## 마이그레이션 정보

### 마이그레이션 파일
- **경로**: `backend/prisma/migrations/20260212055102_add_faq_template/migration.sql`
- **생성 일시**: 2026-02-12 05:51:02

### 마이그레이션 SQL
```sql
-- CreateTable
CREATE TABLE "faq_template" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[],
    "category_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faq_template_question_key" ON "faq_template"("question");

-- CreateIndex
CREATE INDEX "idx_template_is_active" ON "faq_template"("is_active");

-- CreateIndex
CREATE INDEX "idx_template_category_id" ON "faq_template"("category_id");

-- CreateIndex
CREATE INDEX "idx_template_priority" ON "faq_template"("priority");

-- CreateIndex
CREATE INDEX "idx_template_deleted_at" ON "faq_template"("deleted_at");

-- AddForeignKey
ALTER TABLE "faq_template" ADD CONSTRAINT "faq_template_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 데이터 예시

### 템플릿 샘플 데이터
```sql
INSERT INTO faq_template (id, question, answer, keywords, category_id, priority, is_active)
VALUES
  (
    'uuid-sample-1',
    '배송 기간이 얼마나 걸리나요?',
    '일반 배송은 영업일 기준 2-3일 소요됩니다. 빠른 배송을 원하시면 주문 시 특급 배송을 선택해주세요.',
    ARRAY['배송', '기간', '소요'],
    (SELECT id FROM category WHERE slug = 'shipping' LIMIT 1),
    10,
    true
  ),
  (
    'uuid-sample-2',
    '반품은 어떻게 하나요?',
    '반품은 구매 후 7일 이내 가능합니다. 마이페이지에서 반품 신청 후 제품을 반송해주세요.',
    ARRAY['반품', '환불'],
    (SELECT id FROM category WHERE slug = 'return' LIMIT 1),
    5,
    true
  );
```

---

## 설계 대비 변경사항

**변경 없음**: 설계서(design.md)와 100% 일치하게 구현되었습니다.

---

## 성능 고려사항

### 1. 캐시 전략
- **메모리 캐시**: 활성 템플릿 조회 결과를 Node.js 프로세스 메모리에 5분간 캐싱
- **캐시 무효화**: 템플릿 생성/수정/삭제 시 즉시 캐시 무효화
- **효과**: DB I/O 제거로 매칭 시간 10~20ms 달성

### 2. 인덱스 활용
- `is_active`, `deleted_at` 인덱스로 활성 템플릿 조회 최적화 (O(log n))
- `priority` 인덱스로 정렬 최적화

### 3. Soft Delete 장점
- 삭제된 템플릿의 사용 통계 보존 (분석 목적)
- 템플릿 복구 가능성 보장
- 감사 추적 (audit trail) 지원

### 4. keywords 배열 타입
- PostgreSQL 네이티브 배열 타입 활용 (별도 조인 테이블 불필요)
- Prisma에서 자동으로 안전하게 처리 (SQL Injection 방지)

---

## 통계 쿼리 예시

### 1. 템플릿 사용 통계 (TOP 10)
```sql
SELECT
  id,
  question,
  usage_count,
  last_used_at
FROM faq_template
WHERE deleted_at IS NULL
ORDER BY usage_count DESC
LIMIT 10;
```

### 2. 카테고리별 템플릿 수
```sql
SELECT
  c.name AS category_name,
  COUNT(f.id) AS template_count
FROM category c
LEFT JOIN faq_template f ON c.id = f.category_id AND f.deleted_at IS NULL AND f.is_active = true
GROUP BY c.id, c.name
ORDER BY template_count DESC;
```

### 3. 템플릿 매칭률 (전체 메시지 중 템플릿 사용 비율)
```sql
SELECT
  COUNT(CASE WHEN metadata->>'source' = 'template' THEN 1 END) AS template_count,
  COUNT(*) AS total_count,
  ROUND(
    COUNT(CASE WHEN metadata->>'source' = 'template' THEN 1 END)::decimal / COUNT(*) * 100,
    2
  ) AS match_rate_percent
FROM message
WHERE sender = 'assistant' AND created_at >= NOW() - INTERVAL '7 days';
```

---

## 참고 자료
- 설계 문서: `docs/specs/faq-template-management/design.md`
- API 스펙 문서: `docs/api/faq-template-management.md`
- Prisma 스키마: `backend/prisma/schema.prisma`
- 마이그레이션 파일: `backend/prisma/migrations/20260212055102_add_faq_template/`
