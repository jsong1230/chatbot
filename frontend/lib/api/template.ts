// F-07: 답변 템플릿 관리 API 클라이언트

import apiClient from '../api-client';
import {
  Template,
  CreateTemplateDto,
  UpdateTemplateDto,
  GetTemplatesParams,
  TemplatesResponse,
  ApiResponse,
} from '@/types/template';

/**
 * 템플릿 생성
 * @param data - 템플릿 생성 데이터
 * @returns 생성된 템플릿
 * @throws Error - API 호출 실패 시
 */
export async function createTemplate(data: CreateTemplateDto): Promise<Template> {
  try {
    const response = await apiClient.post<ApiResponse<Template>>('/api/templates', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || '템플릿 생성에 실패했습니다');
    }
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || '입력값이 올바르지 않습니다');
    } else if (error.response?.status === 403) {
      throw new Error('관리자 권한이 필요합니다');
    } else if (error.response?.status === 404) {
      throw new Error('카테고리를 찾을 수 없습니다');
    } else if (error.response?.status === 409) {
      throw new Error('이미 등록된 질문입니다');
    }
    throw new Error(error.response?.data?.error || '템플릿 생성에 실패했습니다');
  }
}

/**
 * 템플릿 목록 조회
 * @param params - 조회 파라미터 (필터링, 페이지네이션)
 * @returns 템플릿 목록 및 페이지네이션 정보
 * @throws Error - API 호출 실패 시
 */
export async function getTemplates(params?: GetTemplatesParams): Promise<TemplatesResponse> {
  try {
    const response = await apiClient.get<ApiResponse<TemplatesResponse>>('/api/templates', {
      params,
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || '템플릿 목록을 불러올 수 없습니다');
    }
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || '잘못된 요청입니다');
    } else if (error.response?.status === 403) {
      throw new Error('관리자 권한이 필요합니다');
    }
    throw new Error(error.response?.data?.error || '템플릿 목록을 불러올 수 없습니다');
  }
}

/**
 * 템플릿 단일 조회
 * @param id - 템플릿 ID
 * @returns 템플릿 상세 정보
 * @throws Error - API 호출 실패 시
 */
export async function getTemplateById(id: string): Promise<Template> {
  try {
    const response = await apiClient.get<ApiResponse<Template>>(`/api/templates/${id}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || '템플릿을 찾을 수 없습니다');
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('관리자 권한이 필요합니다');
    } else if (error.response?.status === 404) {
      throw new Error('템플릿을 찾을 수 없습니다');
    }
    throw new Error(error.response?.data?.error || '템플릿을 불러올 수 없습니다');
  }
}

/**
 * 템플릿 수정
 * @param id - 템플릿 ID
 * @param data - 수정할 데이터 (부분 업데이트)
 * @returns 수정된 템플릿
 * @throws Error - API 호출 실패 시
 */
export async function updateTemplate(id: string, data: UpdateTemplateDto): Promise<Template> {
  try {
    const response = await apiClient.put<ApiResponse<Template>>(`/api/templates/${id}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || '템플릿 수정에 실패했습니다');
    }
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || '입력값이 올바르지 않습니다');
    } else if (error.response?.status === 403) {
      throw new Error('관리자 권한이 필요합니다');
    } else if (error.response?.status === 404) {
      throw new Error('템플릿을 찾을 수 없습니다');
    } else if (error.response?.status === 409) {
      throw new Error('이미 등록된 질문입니다');
    }
    throw new Error(error.response?.data?.error || '템플릿 수정에 실패했습니다');
  }
}

/**
 * 템플릿 삭제 (Soft Delete)
 * @param id - 템플릿 ID
 * @throws Error - API 호출 실패 시
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/templates/${id}`);
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('관리자 권한이 필요합니다');
    } else if (error.response?.status === 404) {
      throw new Error('템플릿을 찾을 수 없습니다');
    }
    throw new Error(error.response?.data?.error || '템플릿 삭제에 실패했습니다');
  }
}
