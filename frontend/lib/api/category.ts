// 카테고리 API 클라이언트

import apiClient from '../api-client';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoriesResponse {
  categories: Category[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 활성 카테고리 목록 조회
 * @returns 카테고리 목록
 * @throws Error - API 호출 실패 시
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const response = await apiClient.get<ApiResponse<CategoriesResponse>>('/api/categories');

    if (response.data.success && response.data.data) {
      return response.data.data.categories;
    } else {
      throw new Error(response.data.error || '카테고리 목록을 불러올 수 없습니다');
    }
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '카테고리 목록을 불러올 수 없습니다');
  }
}
