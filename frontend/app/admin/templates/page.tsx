// F-07: 템플릿 목록 페이지 (관리자 전용)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Template } from '@/types/template';
import { getTemplates, deleteTemplate, updateTemplate } from '@/lib/api/template';
import { getCategories, Category } from '@/lib/api/category';
import { TemplateList } from '@/components/templates/TemplateList';

/**
 * 템플릿 목록 페이지
 * 템플릿 조회, 필터링, 검색, 페이지네이션 기능 제공
 */
export default function TemplatesPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터링 상태
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  /**
   * 데이터 로딩 함수
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 템플릿 목록 조회
      const params: any = { page, limit };
      if (categoryFilter) params.categoryId = categoryFilter;
      if (activeFilter !== '') params.isActive = activeFilter === 'true';
      if (searchQuery) params.search = searchQuery;

      const result = await getTemplates(params);
      setTemplates(result.templates);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
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

  /**
   * 카테고리 목록 로딩
   */
  const loadCategories = async () => {
    try {
      const result = await getCategories();
      setCategories(result);
    } catch (err) {
      console.error('카테고리 로딩 실패:', err);
    }
  };

  /**
   * 초기 로딩
   */
  useEffect(() => {
    loadCategories();
  }, []);

  /**
   * 필터/페이지 변경 시 데이터 다시 로딩
   */
  useEffect(() => {
    loadData();
  }, [page, categoryFilter, activeFilter, searchQuery]);

  /**
   * 템플릿 편집
   */
  const handleEdit = (template: Template) => {
    router.push(`/admin/templates/${template.id}/edit`);
  };

  /**
   * 템플릿 삭제
   */
  const handleDelete = async (template: Template) => {
    if (!confirm(`"${template.question}" 템플릿을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteTemplate(template.id);
      alert('템플릿이 삭제되었습니다');
      loadData(); // 목록 새로고침
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  };

  /**
   * 활성 상태 토글
   */
  const handleToggleActive = async (template: Template) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive });
      loadData(); // 목록 새로고침
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경에 실패했습니다');
    }
  };

  /**
   * 검색 제출 (엔터키 또는 버튼 클릭)
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // 검색 시 첫 페이지로
    loadData();
  };

  /**
   * 필터 초기화
   */
  const handleResetFilters = () => {
    setCategoryFilter('');
    setActiveFilter('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="container mx-auto p-6">
      {/* 헤더 */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">템플릿 관리</h1>
        <button
          onClick={() => router.push('/admin/templates/new')}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          새 템플릿 생성
        </button>
      </header>

      {/* 필터 영역 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* 필터 1줄 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 카테고리 필터 */}
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                카테고리
              </label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 활성 상태 필터 */}
            <div>
              <label htmlFor="active-filter" className="block text-sm font-medium text-gray-700 mb-1">
                활성 상태
              </label>
              <select
                id="active-filter"
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>

            {/* 검색 입력 */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                검색
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="질문 또는 답변 내용"
                  maxLength={200}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  검색
                </button>
              </div>
            </div>
          </div>

          {/* 필터 초기화 버튼 */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              필터 초기화
            </button>
          </div>
        </form>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button
            onClick={loadData}
            className="ml-4 underline hover:no-underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && !error && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          로딩 중...
        </div>
      )}

      {/* 템플릿 목록 */}
      {!loading && !error && (
        <>
          {/* 통계 정보 */}
          <div className="mb-4 text-sm text-gray-600">
            전체 {total}개 템플릿 (페이지 {page} / {totalPages})
          </div>

          {/* 템플릿 테이블 */}
          <TemplateList
            templates={templates}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            isLoading={loading}
          />

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // 첫 페이지, 마지막 페이지, 현재 페이지 주변만 표시
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= page - 2 && pageNum <= page + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2 border rounded-lg transition ${
                          page === pageNum
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === page - 3 ||
                    pageNum === page + 3
                  ) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
