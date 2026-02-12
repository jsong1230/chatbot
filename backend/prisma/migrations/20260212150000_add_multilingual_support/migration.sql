-- F-10 다국어 지원 마이그레이션

-- 1. Language Enum 생성
DO $$ BEGIN
  CREATE TYPE "Language" AS ENUM ('ko', 'en');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. conversation 테이블에 language 컬럼 추가
DO $$ BEGIN
  ALTER TABLE "conversation" ADD COLUMN "language" "Language" NOT NULL DEFAULT 'ko';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 3. conversation 인덱스 추가
CREATE INDEX IF NOT EXISTS "idx_conversation_language" ON "conversation"("language");
CREATE INDEX IF NOT EXISTS "idx_conversation_language_analytics" ON "conversation"("language", "created_at", "deleted_at");

-- 4. category 테이블에 name_ko, name_en 컬럼 추가
DO $$ BEGIN
  ALTER TABLE "category" ADD COLUMN "name_ko" TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "category" ADD COLUMN "name_en" TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 5. category 기존 데이터 마이그레이션 (name → name_ko)
UPDATE "category" SET "name_ko" = "name" WHERE "name_ko" IS NULL;

-- 6. category 영어 번역 삽입 (slug 기반으로 정확히 매칭)
UPDATE "category" SET "name_en" = 'Product Inquiry' WHERE "slug" = 'product-inquiry' OR "slug" = 'product';
UPDATE "category" SET "name_en" = 'Shipping Inquiry' WHERE "slug" = 'shipping-inquiry' OR "slug" = 'shipping';
UPDATE "category" SET "name_en" = 'Return/Exchange' WHERE "slug" = 'return-exchange';
UPDATE "category" SET "name_en" = 'Payment Inquiry' WHERE "slug" = 'payment-inquiry' OR "slug" = 'payment';
UPDATE "category" SET "name_en" = 'Other' WHERE "slug" = 'other';

-- 7. 빈 name_en을 처리 (혹시 누락된 경우)
UPDATE "category" SET "name_en" = "name" WHERE "name_en" IS NULL;

-- 8. category 컬럼을 NOT NULL로 변경
ALTER TABLE "category" ALTER COLUMN "name_ko" SET NOT NULL;
ALTER TABLE "category" ALTER COLUMN "name_en" SET NOT NULL;

-- 9. category UNIQUE 제약조건 추가
DO $$ BEGIN
  ALTER TABLE "category" ADD CONSTRAINT "category_name_ko_key" UNIQUE ("name_ko");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN unique_violation THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "category" ADD CONSTRAINT "category_name_en_key" UNIQUE ("name_en");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN unique_violation THEN null;
END $$;

-- 10. faq_template 테이블 수정
-- 10-1. language 컬럼 추가
DO $$ BEGIN
  ALTER TABLE "faq_template" ADD COLUMN "language" "Language" NOT NULL DEFAULT 'ko';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 10-2. 기존 UNIQUE 제약 제거 (question만)
ALTER TABLE "faq_template" DROP CONSTRAINT IF EXISTS "faq_template_question_key";

-- 10-3. 복합 UNIQUE 제약 추가 (question + language)
DO $$ BEGIN
  ALTER TABLE "faq_template" ADD CONSTRAINT "unique_question_per_language" UNIQUE ("question", "language");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN unique_violation THEN null;
END $$;

-- 10-4. faq_template 인덱스 추가
CREATE INDEX IF NOT EXISTS "idx_template_language_active" ON "faq_template"("language", "is_active");
CREATE INDEX IF NOT EXISTS "idx_template_category_language" ON "faq_template"("category_id", "language");
