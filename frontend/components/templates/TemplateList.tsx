// F-07: 템플릿 목록 테이블 컴포넌트

'use client';

import { Template } from '@/types/template';

interface TemplateListProps {
  /** 템플릿 목록 */
  templates: Template[];
  /** 편집 버튼 클릭 핸들러 */
  onEdit: (template: Template) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete: (template: Template) => void;
  /** 활성 상태 토글 핸들러 */
  onToggleActive: (template: Template) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 템플릿 목록 테이블
 * 템플릿 정보를 테이블 형태로 표시하고 편집/삭제 버튼 제공
 */
export function TemplateList({
  templates,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
}: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        등록된 템플릿이 없습니다
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                질문
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                키워드 수
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                우선순위
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용 횟수
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                활성 상태
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50 transition">
                {/* 질문 */}
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                    {template.question}
                  </div>
                  {template.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.keywords.slice(0, 3).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {template.keywords.length > 3 && (
                        <span className="inline-block px-2 py-0.5 text-gray-500 text-xs">
                          +{template.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* 카테고리 */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {template.categoryName || '전체'}
                </td>

                {/* 키워드 수 */}
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {template.keywords.length}
                </td>

                {/* 우선순위 */}
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      template.priority > 0
                        ? 'bg-green-100 text-green-800'
                        : template.priority < 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {template.priority}
                  </span>
                </td>

                {/* 사용 횟수 */}
                <td className="px-6 py-4 text-center text-sm text-gray-900">
                  {template.usageCount}
                </td>

                {/* 활성 상태 토글 */}
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => onToggleActive(template)}
                    disabled={isLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      template.isActive ? 'bg-blue-500' : 'bg-gray-300'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label={`템플릿 ${template.isActive ? '비활성화' : '활성화'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        template.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>

                {/* 작업 버튼 */}
                <td className="px-6 py-4 text-center text-sm">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEdit(template)}
                      disabled={isLoading}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition disabled:opacity-50"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => onDelete(template)}
                      disabled={isLoading}
                      className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
