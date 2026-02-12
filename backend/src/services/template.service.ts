// FAQ 템플릿 비즈니스 로직
// F-07 답변 템플릿 관리

import { FaqTemplate } from '@prisma/client';
import { prisma } from '../lib/prisma.client';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger.utils';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  MatchedTemplate,
  TemplateResponse,
  TemplateListResponse,
} from '../types/template.types';

// 메모리 캐시 (Node.js 프로세스 내)
let cachedTemplates: (FaqTemplate & { category?: { name: string } | null })[] | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

export class TemplateService {
  /**
   * 템플릿 생성
   */
  async createTemplate(data: CreateTemplateDto): Promise<TemplateResponse> {
    // 1. 중복 질문 체크 (대소문자 무시)
    const existing = await prisma.faqTemplate.findFirst({
      where: {
        question: { equals: data.question, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new AppError(409, '이미 등록된 질문입니다');
    }

    // 2. categoryId 유효성 검증 (null이 아닌 경우)
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new AppError(404, '카테고리를 찾을 수 없습니다');
      }
    }

    // 3. 템플릿 생성
    const template = await prisma.faqTemplate.create({
      data: {
        question: data.question,
        answer: data.answer,
        keywords: data.keywords || [],
        categoryId: data.categoryId || null,
        priority: data.priority ?? 0,
        isActive: data.isActive ?? true,
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    // 4. 캐시 무효화
    this.invalidateCache();

    logger.info(`템플릿 생성 완료: ${template.id}`);

    return this.formatTemplateResponse(template);
  }

  /**
   * 템플릿 목록 조회 (필터링 + 페이지네이션)
   */
  async getTemplates(query: TemplateQueryDto): Promise<TemplateListResponse> {
    const { categoryId, isActive, search, page = 1, limit = 20 } = query;

    // 1. WHERE 조건 구성
    const where: any = {
      deletedAt: null, // Soft Delete 제외
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 2. 총 개수 조회
    const total = await prisma.faqTemplate.count({ where });

    // 3. 템플릿 목록 조회
    const templates = await prisma.faqTemplate.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    // 4. 응답 포맷
    return {
      templates: templates.map((t) => this.formatTemplateResponse(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 템플릿 단일 조회
   */
  async getTemplateById(id: string): Promise<TemplateResponse> {
    const template = await prisma.faqTemplate.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    if (!template) {
      throw new AppError(404, '템플릿을 찾을 수 없습니다');
    }

    return this.formatTemplateResponse(template);
  }

  /**
   * 템플릿 수정
   */
  async updateTemplate(id: string, data: UpdateTemplateDto): Promise<TemplateResponse> {
    // 1. 템플릿 존재 확인
    const existing = await prisma.faqTemplate.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, '템플릿을 찾을 수 없습니다');
    }

    // 2. 질문 중복 체크 (다른 템플릿과 중복 시)
    if (data.question) {
      const duplicate = await prisma.faqTemplate.findFirst({
        where: {
          question: { equals: data.question, mode: 'insensitive' },
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new AppError(409, '이미 등록된 질문입니다');
      }
    }

    // 3. categoryId 유효성 검증 (변경 시)
    if (data.categoryId !== undefined && data.categoryId !== null) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new AppError(404, '카테고리를 찾을 수 없습니다');
      }
    }

    // 4. 템플릿 수정
    const updated = await prisma.faqTemplate.update({
      where: { id },
      data: {
        question: data.question,
        answer: data.answer,
        keywords: data.keywords,
        categoryId: data.categoryId,
        priority: data.priority,
        isActive: data.isActive,
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    // 5. 캐시 무효화
    this.invalidateCache();

    logger.info(`템플릿 수정 완료: ${id}`);

    return this.formatTemplateResponse(updated);
  }

  /**
   * 템플릿 삭제 (Soft Delete)
   */
  async deleteTemplate(id: string): Promise<void> {
    // 1. 템플릿 존재 확인
    const template = await prisma.faqTemplate.findFirst({
      where: { id, deletedAt: null },
    });

    if (!template) {
      throw new AppError(404, '템플릿을 찾을 수 없습니다');
    }

    // 2. Soft Delete
    await prisma.faqTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 3. 캐시 무효화
    this.invalidateCache();

    logger.info(`템플릿 삭제 완료 (Soft Delete): ${id}`);
  }

  /**
   * 템플릿 매칭 (키워드 기반)
   */
  async matchTemplate(
    userMessage: string,
    categoryId?: string | null
  ): Promise<MatchedTemplate | null> {
    const startTime = Date.now();

    try {
      // 1. 메시지 정규화
      const normalizedMessage = userMessage.toLowerCase().trim();

      // 2. 활성 템플릿 조회 (캐시 활용)
      const activeTemplates = await this.getActiveTemplates();

      // 3. 매칭 점수 계산
      const candidates = activeTemplates
        .map((template) => {
          // 3-1. 키워드 매칭 검사 (모든 키워드가 포함되어야 함)
          const matchedKeywords = template.keywords.filter((keyword) =>
            normalizedMessage.includes(keyword.toLowerCase())
          );

          // 모든 키워드가 포함되지 않으면 점수 0
          if (matchedKeywords.length !== template.keywords.length) {
            return { template, score: 0 };
          }

          // 3-2. 점수 계산
          let score = matchedKeywords.length * 10; // 키워드 개수 × 10
          score += template.priority; // 우선순위 추가

          // 카테고리 일치 시 보너스
          if (categoryId && template.categoryId === categoryId) {
            score += 5;
          }

          return { template, score };
        })
        .filter((c) => c.score >= 10); // 임계값 10점 이상 필터링

      // 4. 매칭 실패
      if (candidates.length === 0) {
        return null;
      }

      // 5. 최고 점수 선택 (동점이면 최신 템플릿)
      candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.template.createdAt.getTime() - a.template.createdAt.getTime();
      });

      const winner = candidates[0];

      // 6. 사용 통계 업데이트 (비동기, 실패해도 무시)
      this.updateUsageStats(winner.template.id).catch((err) =>
        logger.warn('템플릿 사용 통계 업데이트 실패:', err)
      );

      const matchTimeMs = Date.now() - startTime;

      // 성능 모니터링
      if (matchTimeMs > 50) {
        logger.warn(`템플릿 매칭 성능 저하: ${matchTimeMs}ms`);
      }

      return {
        templateId: winner.template.id,
        answer: winner.template.answer,
        matchScore: winner.score,
      };
    } catch (error: any) {
      logger.error('템플릿 매칭 중 에러 발생:', error);
      return null; // 폴백을 위해 null 반환
    }
  }

  /**
   * 활성 템플릿 조회 (캐시 활용)
   */
  private async getActiveTemplates(): Promise<
    (FaqTemplate & { category?: { name: string } | null })[]
  > {
    // 캐시 유효성 확인
    if (cachedTemplates && Date.now() < cacheExpiry) {
      return cachedTemplates;
    }

    // DB 조회
    cachedTemplates = await prisma.faqTemplate.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: { priority: 'desc' },
    });

    cacheExpiry = Date.now() + CACHE_TTL;

    logger.info(`템플릿 캐시 갱신 완료 (${cachedTemplates.length}개)`);

    return cachedTemplates;
  }

  /**
   * 캐시 무효화
   */
  private invalidateCache(): void {
    cachedTemplates = null;
    cacheExpiry = 0;
    logger.info('템플릿 캐시 무효화 완료');
  }

  /**
   * 사용 통계 업데이트 (비동기)
   */
  private async updateUsageStats(templateId: string): Promise<void> {
    await prisma.faqTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * 템플릿 응답 포맷
   */
  private formatTemplateResponse(
    template: FaqTemplate & { category?: { name: string } | null }
  ): TemplateResponse {
    return {
      id: template.id,
      question: template.question,
      answer: template.answer,
      keywords: template.keywords,
      categoryId: template.categoryId,
      categoryName: template.category?.name,
      priority: template.priority,
      isActive: template.isActive,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
