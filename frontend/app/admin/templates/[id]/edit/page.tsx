// F-07: 템플릿 수정 페이지 (관리자 전용)

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getTemplateById, updateTemplate } from '@/lib/api/template';
import { getCategories, Category } from '@/lib/api/category';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { Template, UpdateTemplateDto } from '@/types/template';

/**
 * 템플릿 수정 페이지
 */
export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 템플릿 및 카테고리 데이터 로딩
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 템플릿과 카테고리 동시 로딩
        const [templateData, categoriesData] = await Promise.all([
          getTemplateById(templateId),
          getCategories(),
        ]);

        setTemplate(templateData);
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');

        // 권한 에러면 로그인 페이지로 리다이렉트
        if (err instanceof Error && err.message.includes('권한')) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [templateId, router]);

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (data: UpdateTemplateDto) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await updateTemplate(templateId, data);

      alert('템플릿이 수정되었습니다');
      router.push('/admin/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 수정에 실패했습니다');
      setIsSubmitting(false);
    }
  };

  /**
   * 취소 핸들러
   */
  const handleCancel = () => {
    if (confirm('수정 중인 내용이 저장되지 않습니다. 목록으로 돌아가시겠습니까?')) {
      router.push('/admin/templates');
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          로딩 중...
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error && !template) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => router.push('/admin/templates')}
            className="ml-4 underline hover:no-underline"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 헤더 */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">템플릿 수정</h1>
        <p className="text-gray-600">
          등록된 템플릿을 수정하여 답변 품질을 개선하세요
        </p>
      </header>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 템플릿 정보 */}
      {template && (
        <>
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">생성일:</span>{' '}
                <span className="font-medium">
                  {new Date(template.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">수정일:</span>{' '}
                <span className="font-medium">
                  {new Date(template.updatedAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">사용 횟수:</span>{' '}
                <span className="font-medium">{template.usageCount}회</span>
              </div>
              {template.lastUsedAt && (
                <div>
                  <span className="text-gray-600">최근 사용:</span>{' '}
                  <span className="font-medium">
                    {new Date(template.lastUsedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 템플릿 폼 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <TemplateForm
              initialData={template}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </div>
        </>
      )}

      {/* 안내 문구 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">수정 시 주의사항</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>질문을 변경하면 기존 매칭 패턴이 달라질 수 있습니다</li>
          <li>키워드를 추가하면 매칭 조건이 더 엄격해집니다</li>
          <li>우선순위를 높이면 다른 템플릿보다 먼저 선택됩니다</li>
          <li>비활성화하면 즉시 매칭에서 제외됩니다 (최대 5분 지연 가능)</li>
        </ul>
      </div>
    </div>
  );
}
