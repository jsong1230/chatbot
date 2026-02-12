// FAQ 템플릿 입력 검증 스키마
// F-07 답변 템플릿 관리

import { z } from 'zod';

/**
 * 템플릿 생성 검증 스키마
 */
export const createTemplateSchema = z.object({
  question: z
    .string()
    .min(10, 'question은 10자 이상이어야 합니다')
    .max(500, 'question은 500자 이하여야 합니다'),
  answer: z
    .string()
    .min(10, 'answer는 10자 이상이어야 합니다')
    .max(2000, 'answer는 2000자 이하여야 합니다'),
  keywords: z
    .array(
      z
        .string()
        .min(2, '각 키워드는 2자 이상이어야 합니다')
        .max(50, '각 키워드는 50자 이하여야 합니다')
    )
    .max(20, 'keywords는 최대 20개까지 가능합니다')
    .optional()
    .default([]),
  categoryId: z.string().uuid('유효한 UUID가 아닙니다').nullable().optional(),
  priority: z
    .number()
    .int('priority는 정수여야 합니다')
    .min(-100, 'priority는 -100 이상이어야 합니다')
    .max(100, 'priority는 100 이하여야 합니다')
    .optional()
    .default(0),
  isActive: z.boolean().optional().default(true),
});

/**
 * 템플릿 수정 검증 스키마
 */
export const updateTemplateSchema = z.object({
  question: z
    .string()
    .min(10, 'question은 10자 이상이어야 합니다')
    .max(500, 'question은 500자 이하여야 합니다')
    .optional(),
  answer: z
    .string()
    .min(10, 'answer는 10자 이상이어야 합니다')
    .max(2000, 'answer는 2000자 이하여야 합니다')
    .optional(),
  keywords: z
    .array(
      z
        .string()
        .min(2, '각 키워드는 2자 이상이어야 합니다')
        .max(50, '각 키워드는 50자 이하여야 합니다')
    )
    .max(20, 'keywords는 최대 20개까지 가능합니다')
    .optional(),
  categoryId: z.string().uuid('유효한 UUID가 아닙니다').nullable().optional(),
  priority: z
    .number()
    .int('priority는 정수여야 합니다')
    .min(-100, 'priority는 -100 이상이어야 합니다')
    .max(100, 'priority는 100 이하여야 합니다')
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * 템플릿 조회 검증 스키마
 */
export const queryTemplateSchema = z.object({
  categoryId: z.string().uuid('유효한 UUID가 아닙니다').optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().max(200, '검색어는 200자 이하여야 합니다').optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1, '페이지는 1 이상이어야 합니다')
    .optional()
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 100, 'limit은 1~100 사이여야 합니다')
    .optional()
    .default('20'),
});
