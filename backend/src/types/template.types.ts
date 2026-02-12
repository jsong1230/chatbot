// FAQ 템플릿 관련 타입 정의
// F-07 답변 템플릿 관리

/**
 * 템플릿 생성 DTO
 */
export interface CreateTemplateDto {
  question: string; // 10~500자
  answer: string; // 10~2000자
  keywords?: string[]; // 최대 20개, 각 2~50자
  categoryId?: string | null; // UUID 또는 null (전체 카테고리)
  priority?: number; // -100 ~ 100, 기본값 0
  isActive?: boolean; // 기본값 true
}

/**
 * 템플릿 수정 DTO
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
 * 템플릿 조회 필터 DTO
 */
export interface TemplateQueryDto {
  categoryId?: string; // 카테고리 필터
  isActive?: boolean; // 활성화 상태 필터
  search?: string; // 질문/답변 검색 (부분 일치)
  page?: number; // 페이지 번호 (기본값: 1)
  limit?: number; // 페이지 크기 (기본값: 20, 최대: 100)
}

/**
 * 템플릿 매칭 결과 타입
 */
export interface MatchedTemplate {
  templateId: string; // 매칭된 템플릿 ID
  answer: string; // 템플릿 답변
  matchScore: number; // 매칭 점수
}

/**
 * 템플릿 응답 타입 (API 응답)
 */
export interface TemplateResponse {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  categoryId: string | null;
  categoryName?: string; // Category join 시 포함
  priority: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 템플릿 목록 응답 (페이지네이션 포함)
 */
export interface TemplateListResponse {
  templates: TemplateResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
