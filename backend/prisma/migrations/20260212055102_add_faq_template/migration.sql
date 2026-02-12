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
