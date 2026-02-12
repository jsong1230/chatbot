/**
 * 지원 언어 타입 (한국어, 영어)
 */
export type Language = 'ko' | 'en';

/**
 * 언어 변경 요청
 */
export interface ChangeLanguageRequest {
  language: Language;
}

/**
 * 언어 변경 응답
 */
export interface ChangeLanguageResponse {
  success: boolean;
  data: {
    conversationId: string;
    language: Language;
    updatedAt: string;
  };
}
