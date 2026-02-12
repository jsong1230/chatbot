'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '@/types/language.types';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * 언어 상태 관리 Provider
 * - 현재 UI 언어 상태 관리
 * - localStorage에 선택한 언어 저장 (브라우저 새로고침 시에도 유지)
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // localStorage에서 초기 언어 로드 (기본값: 'ko')
  const [language, setLanguageState] = useState<Language>('ko');
  const [mounted, setMounted] = useState(false);

  // 클라이언트에서만 localStorage 접근
  useEffect(() => {
    setMounted(true);
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage === 'ko' || savedLanguage === 'en') {
      setLanguageState(savedLanguage);
    }
  }, []);

  // 언어 변경 시 localStorage에 저장
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    if (mounted) {
      localStorage.setItem('language', newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * 언어 상태 및 변경 함수를 가져오는 커스텀 훅
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
