// 언어 감지 유틸리티
// F-10 다국어 지원

import { franc } from 'franc';

export type SupportedLanguage = 'ko' | 'en';

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
}

const CONFIDENCE_THRESHOLD = 0.5;
const FALLBACK_LANGUAGE: SupportedLanguage = 'ko';
const MIN_TEXT_LENGTH = 5;

/**
 * 텍스트의 언어를 자동 감지
 * @param text 감지할 텍스트
 * @returns 감지된 언어 ('ko' 또는 'en')
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  // 짧은 메시지는 감지 어려움 → 폴백
  if (text.length < MIN_TEXT_LENGTH) {
    return {
      language: FALLBACK_LANGUAGE,
      confidence: 0,
    };
  }

  // franc 라이브러리로 언어 감지 (ISO 639-3 코드 반환)
  // only 옵션으로 한국어/영어만 감지
  const detectedCode = franc(text, { only: ['kor', 'eng'], minLength: 10 });

  // 코드 변환: kor → ko, eng → en
  const languageMap: Record<string, SupportedLanguage> = {
    kor: 'ko',
    eng: 'en',
  };

  const language = languageMap[detectedCode];

  // 'und' (undefined) = 감지 실패 → 폴백
  if (!language || detectedCode === 'und') {
    return {
      language: FALLBACK_LANGUAGE,
      confidence: 0,
    };
  }

  // franc는 신뢰도 점수를 직접 제공하지 않으므로 간단히 0.9로 설정
  // (franc-all을 사용하면 여러 후보의 점수를 비교할 수 있지만, 성능상 franc 사용)
  const confidence = 0.9;

  return {
    language,
    confidence,
  };
}
