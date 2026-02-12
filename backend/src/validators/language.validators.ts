// 언어 관련 Validation 스키마 (F-10 다국어 지원)

import { z } from 'zod';
import { Language } from '@prisma/client';

// PATCH /api/conversations/:id/language - 대화 언어 변경
export const updateLanguageSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid('유효한 UUID 형식이 아닙니다'),
  }),
  body: z.object({
    language: z.nativeEnum(Language, {
      message: "language는 'ko' 또는 'en'이어야 합니다",
    }),
  }),
});

// GET /api/categories - 카테고리 조회 (language 쿼리 파라미터)
export const categoriesQuerySchema = z.object({
  query: z.object({
    language: z
      .nativeEnum(Language, {
        message: "language는 'ko' 또는 'en'이어야 합니다",
      })
      .optional()
      .default(Language.ko),
  }),
});
