'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { changeConversationLanguage } from '@/lib/chat-api';
import { Language } from '@/types/language.types';
import toast from 'react-hot-toast';

interface LanguageToggleProps {
  conversationId: string | null;
  onLanguageChange?: (language: Language) => void;
}

/**
 * 언어 토글 버튼 컴포넌트
 * - 한국어 ↔ 영어 전환
 * - UI 언어 즉시 변경 (Context)
 * - 대화 언어 API 호출 (conversationId가 있을 때만)
 */
export default function LanguageToggle({ conversationId, onLanguageChange }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const handleToggle = async () => {
    const newLanguage: Language = language === 'ko' ? 'en' : 'ko';

    // UI 언어 즉시 변경
    setLanguage(newLanguage);

    // 대화가 있으면 서버에 언어 변경 요청
    if (conversationId) {
      try {
        await changeConversationLanguage(conversationId, { language: newLanguage });

        // 성공 메시지 (다국어)
        const successMessage = newLanguage === 'ko'
          ? '언어가 한국어로 변경되었습니다'
          : 'Language changed to English';
        toast.success(successMessage);

        // 부모 컴포넌트에 변경 알림
        onLanguageChange?.(newLanguage);
      } catch (error: any) {
        console.error('Failed to change conversation language:', error);

        // 에러 시 UI 언어 롤백
        setLanguage(language);

        const errorMessage = language === 'ko'
          ? '언어 변경에 실패했습니다'
          : 'Failed to change language';
        toast.error(errorMessage);
      }
    } else {
      // 신규 대화는 UI 언어만 변경 (다음 메시지 전송 시 자동 감지)
      const successMessage = newLanguage === 'ko'
        ? '언어가 한국어로 변경되었습니다'
        : 'Language changed to English';
      toast.success(successMessage);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      aria-label={language === 'ko' ? '언어 변경 (한국어 → English)' : 'Change Language (English → 한국어)'}
    >
      <span className="text-lg">🌐</span>
      <span className="hidden sm:inline">
        {language === 'ko' ? 'KO' : 'EN'}
      </span>
    </button>
  );
}
