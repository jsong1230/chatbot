// F-07: 템플릿 생성 페이지 (관리자 전용)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTemplate } from '@/lib/api/template';
import { getCategories, Category } from '@/lib/api/category';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { CreateTemplateDto } from '@/types/template';

/**
 * 템플릿 생성 페이지
 */
export default function NewTemplatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 카테고리 목록 로딩
   */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await getCategories();
        setCategories(result);
      } catch (err) {
        console.error('카테고리 로딩 실패:', err);
        setError('카테고리 목록을 불러올 수 없습니다');
      }
    };

    loadCategories();
  }, []);

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (data: CreateTemplateDto) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await createTemplate(data);

      alert('템플릿이 생성되었습니다');
      router.push('/admin/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 생성에 실패했습니다');
      setIsSubmitting(false);
    }
  };

  /**
   * 취소 핸들러
   */
  const handleCancel = () => {
    if (confirm('작성 중인 내용이 저장되지 않습니다. 목록으로 돌아가시겠습니까?')) {
      router.push('/admin/templates');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 헤더 */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">새 템플릿 생성</h1>
        <p className="text-gray-600">
          자주 묻는 질문과 답변을 등록하여 AI 답변 품질을 개선하세요
        </p>
      </header>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 템플릿 폼 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <TemplateForm
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* 안내 문구 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">템플릿 작성 가이드</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>질문은 사용자가 입력할 가능성이 높은 표현으로 작성하세요</li>
          <li>키워드는 질문 매칭에 사용되며, 모든 키워드가 포함되어야 매칭됩니다</li>
          <li>우선순위가 높을수록 동일 점수에서 먼저 선택됩니다</li>
          <li>카테고리를 지정하면 해당 카테고리 대화에서만 매칭됩니다</li>
          <li>비활성화하면 매칭에서 제외되지만 데이터는 보존됩니다</li>
        </ul>
      </div>
    </div>
  );
}
