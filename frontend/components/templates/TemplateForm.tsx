// F-07: 템플릿 생성/수정 폼 컴포넌트

'use client';

import { useState, useEffect } from 'react';
import { Template, CreateTemplateDto, UpdateTemplateDto } from '@/types/template';

interface Category {
  id: string;
  name: string;
}

interface TemplateFormProps {
  /** 수정 모드일 때 기존 템플릿 데이터 */
  initialData?: Template | null;
  /** 카테고리 목록 */
  categories: Category[];
  /** 제출 핸들러 */
  onSubmit: (data: any) => Promise<void>;
  /** 취소 핸들러 */
  onCancel: () => void;
  /** 제출 중 상태 */
  isSubmitting?: boolean;
}

/**
 * 템플릿 생성/수정 폼
 * 실시간 검증, 글자 수 표시, 키워드 태그 입력
 */
export function TemplateForm({
  initialData,
  categories,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TemplateFormProps) {
  const [question, setQuestion] = useState(initialData?.question || '');
  const [answer, setAnswer] = useState(initialData?.answer || '');
  const [keywords, setKeywords] = useState<string[]>(initialData?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [priority, setPriority] = useState(initialData?.priority || 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 실시간 검증
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (question && (question.length < 10 || question.length > 500)) {
      newErrors.question = '질문은 10자 이상 500자 이하여야 합니다';
    }

    if (answer && (answer.length < 10 || answer.length > 2000)) {
      newErrors.answer = '답변은 10자 이상 2000자 이하여야 합니다';
    }

    if (keywords.length > 20) {
      newErrors.keywords = '키워드는 최대 20개까지 가능합니다';
    }

    if (priority < -100 || priority > 100) {
      newErrors.priority = '우선순위는 -100 ~ 100 사이여야 합니다';
    }

    setErrors(newErrors);
  }, [question, answer, keywords, priority]);

  // 키워드 추가
  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;

    if (trimmed.length < 2 || trimmed.length > 50) {
      setErrors({ ...errors, keywordInput: '키워드는 2자 이상 50자 이하여야 합니다' });
      return;
    }

    if (keywords.includes(trimmed)) {
      setErrors({ ...errors, keywordInput: '이미 추가된 키워드입니다' });
      return;
    }

    if (keywords.length >= 20) {
      setErrors({ ...errors, keywordInput: '키워드는 최대 20개까지 가능합니다' });
      return;
    }

    setKeywords([...keywords, trimmed]);
    setKeywordInput('');
    setErrors({ ...errors, keywordInput: '' });
  };

  // 키워드 삭제
  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  // 키워드 입력 엔터키 처리
  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 최종 검증
    if (!question || question.length < 10 || question.length > 500) {
      setErrors({ ...errors, question: '질문은 10자 이상 500자 이하여야 합니다' });
      return;
    }

    if (!answer || answer.length < 10 || answer.length > 2000) {
      setErrors({ ...errors, answer: '답변은 10자 이상 2000자 이하여야 합니다' });
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    const data: CreateTemplateDto | UpdateTemplateDto = {
      question,
      answer,
      keywords,
      categoryId: categoryId || null,
      priority,
      isActive,
    };

    await onSubmit(data);
  };

  const isFormValid =
    question.length >= 10 &&
    question.length <= 500 &&
    answer.length >= 10 &&
    answer.length <= 2000 &&
    keywords.length <= 20 &&
    priority >= -100 &&
    priority <= 100 &&
    Object.keys(errors).length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 질문 입력 */}
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
          질문 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="배송 기간이 얼마나 걸리나요?"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.question ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          <span className={`text-sm ${errors.question ? 'text-red-500' : 'text-gray-500'}`}>
            {errors.question || ''}
          </span>
          <span className="text-sm text-gray-500">
            {question.length} / 500
          </span>
        </div>
      </div>

      {/* 답변 입력 */}
      <div>
        <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
          답변 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={2000}
          rows={6}
          placeholder="일반 배송은 영업일 기준 2-3일 소요됩니다."
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.answer ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          <span className={`text-sm ${errors.answer ? 'text-red-500' : 'text-gray-500'}`}>
            {errors.answer || ''}
          </span>
          <span className="text-sm text-gray-500">
            {answer.length} / 2000
          </span>
        </div>
      </div>

      {/* 키워드 입력 */}
      <div>
        <label htmlFor="keyword-input" className="block text-sm font-medium text-gray-700 mb-1">
          키워드 (최대 20개)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="keyword-input"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="키워드 입력 후 Enter 또는 추가 버튼"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            disabled={isSubmitting || keywords.length >= 20}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            추가
          </button>
        </div>
        {errors.keywordInput && (
          <p className="text-sm text-red-500 mt-1">{errors.keywordInput}</p>
        )}
        {errors.keywords && (
          <p className="text-sm text-red-500 mt-1">{errors.keywords}</p>
        )}

        {/* 키워드 태그 목록 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {keywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {keyword}
              <button
                type="button"
                onClick={() => handleRemoveKeyword(index)}
                disabled={isSubmitting}
                className="hover:text-blue-600"
                aria-label={`${keyword} 삭제`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 카테고리 선택 */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          카테고리
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* 우선순위 입력 */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
          우선순위 (-100 ~ 100)
        </label>
        <input
          type="number"
          id="priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          min={-100}
          max={100}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.priority ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
          disabled={isSubmitting}
        />
        {errors.priority && (
          <p className="text-sm text-red-500 mt-1">{errors.priority}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          우선순위가 높을수록 먼저 매칭됩니다
        </p>
      </div>

      {/* 활성화 상태 토글 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
        <label htmlFor="is-active" className="text-sm font-medium text-gray-700">
          활성화 상태 (비활성화 시 매칭에서 제외)
        </label>
      </div>

      {/* 제출/취소 버튼 */}
      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : initialData ? '수정' : '생성'}
        </button>
      </div>
    </form>
  );
}
