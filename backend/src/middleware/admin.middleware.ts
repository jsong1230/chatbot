// 관리자 권한 검증 미들웨어
// F-07 답변 템플릿 관리

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * 관리자 권한 검증 미들웨어
 * requireAuth와 함께 사용하여 관리자만 접근 가능하도록 제한
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError(401, '인증이 필요합니다'));
  }

  if (req.user.role !== 'admin') {
    return next(new AppError(403, '관리자 권한이 필요합니다'));
  }

  next();
}
