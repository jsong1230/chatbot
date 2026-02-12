'use client';

import { useLanguage } from './useLanguage';
import koMessages from '@/messages/ko.json';
import enMessages from '@/messages/en.json';

type Messages = typeof koMessages;

/**
 * 번역 훅 (클라이언트 전용)
 * next-intl의 복잡한 설정 대신 간단한 객체 기반 번역 사용
 */
export function useTranslation() {
  const { language } = useLanguage();

  const messages: Messages = language === 'ko' ? koMessages : enMessages;

  // 중첩된 키 접근 (예: "chat.inputPlaceholder")
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // 키가 없으면 키 자체 반환
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return { t, language };
}
