// F-07: 답변 템플릿 관리 타입 정의

/**
 * 템플릿 엔티티
 */
export interface Template {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  categoryId: string | null;
  categoryName?: string;
  priority: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 템플릿 생성 DTO
 */
export interface CreateTemplateDto {
  question: string;
  answer: string;
  keywords?: string[];
  categoryId?: string | null;
  priority?: number;
  isActive?: boolean;
}

/**
 * 템플릿 수정 DTO (모든 필드 선택적)
 */
export interface UpdateTemplateDto {
  question?: string;
  answer?: string;
  keywords?: string[];
  categoryId?: string | null;
  priority?: number;
  isActive?: boolean;
}

/**
 * 템플릿 목록 조회 파라미터
 */
export interface GetTemplatesParams {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * 페이지네이션 정보
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 템플릿 목록 응답
 */
export interface TemplatesResponse {
  templates: Template[];
  pagination: Pagination;
}

/**
 * API 공통 응답 형식
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
