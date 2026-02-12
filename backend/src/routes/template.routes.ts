// FAQ 템플릿 API 라우트
// F-07 답변 템플릿 관리

import { Router, Request, Response, NextFunction } from 'express';
import { TemplateService } from '../services/template.service';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createTemplateSchema,
  updateTemplateSchema,
  queryTemplateSchema,
} from '../validators/template.validator';
import { AppError } from '../errors/AppError';
import rateLimit from 'express-rate-limit';

const router = Router();
const templateService = new TemplateService();

// Rate Limiting (관리자당 분당 30회)
const templateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30,
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/templates
 * 템플릿 생성 (관리자 전용)
 */
router.post(
  '/templates',
  requireAuth,
  requireAdmin,
  templateRateLimiter,
  validate(createTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateService.createTemplate(req.body);

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/templates
 * 템플릿 목록 조회 (관리자 전용)
 */
router.get(
  '/templates',
  requireAuth,
  requireAdmin,
  templateRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Query validation
      const validatedQuery = queryTemplateSchema.parse(req.query);

      const result = await templateService.getTemplates(validatedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/templates/:id
 * 템플릿 단일 조회 (관리자 전용)
 */
router.get(
  '/templates/:id',
  requireAuth,
  requireAdmin,
  templateRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError(400, '템플릿 ID가 필요합니다');
      }

      const template = await templateService.getTemplateById(id);

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/templates/:id
 * 템플릿 수정 (관리자 전용)
 */
router.put(
  '/templates/:id',
  requireAuth,
  requireAdmin,
  templateRateLimiter,
  validate(updateTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError(400, '템플릿 ID가 필요합니다');
      }

      const template = await templateService.updateTemplate(id, req.body);

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/templates/:id
 * 템플릿 삭제 (Soft Delete, 관리자 전용)
 */
router.delete(
  '/templates/:id',
  requireAuth,
  requireAdmin,
  templateRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError(400, '템플릿 ID가 필요합니다');
      }

      await templateService.deleteTemplate(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
