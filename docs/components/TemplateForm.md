# TemplateForm

## 용도
FAQ 템플릿을 생성하거나 수정하는 폼 컴포넌트입니다. 실시간 검증, 글자 수 표시, 키워드 태그 입력 기능을 제공합니다.

## Props

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| initialData | Template \| null | No | null | 수정 모드일 때 기존 템플릿 데이터 |
| categories | Category[] | Yes | - | 카테고리 목록 (드롭다운 옵션) |
| onSubmit | (data: any) => Promise<void> | Yes | - | 폼 제출 핸들러 (생성/수정 데이터) |
| onCancel | () => void | Yes | - | 취소 버튼 핸들러 |
| isSubmitting | boolean | No | false | 제출 중 상태 (버튼 비활성화) |

## 사용 예시

### 생성 모드
```tsx
import { TemplateForm } from '@/components/templates/TemplateForm';
import { createTemplate } from '@/lib/api/template';

function NewTemplatePage() {
  const [categories, setCategories] = useState([]);

  const handleSubmit = async (data) => {
    await createTemplate(data);
    router.push('/admin/templates');
  };

  return (
    <TemplateForm
      categories={categories}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
```

### 수정 모드
```tsx
import { TemplateForm } from '@/components/templates/TemplateForm';
import { updateTemplate } from '@/lib/api/template';

function EditTemplatePage() {
  const [template, setTemplate] = useState(null);
  const [categories, setCategories] = useState([]);

  const handleSubmit = async (data) => {
    await updateTemplate(template.id, data);
    router.push('/admin/templates');
  };

  return (
    <TemplateForm
      initialData={template}
      categories={categories}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
```

## 상태 처리

### 내부 상태
- **question**: 질문 입력값 (10~500자)
- **answer**: 답변 입력값 (10~2000자)
- **keywords**: 키워드 배열 (최대 20개)
- **keywordInput**: 키워드 입력 필드 임시값
- **categoryId**: 선택된 카테고리 ID (null이면 전체)
- **priority**: 우선순위 (-100 ~ 100)
- **isActive**: 활성화 여부 (기본값: true)
- **errors**: 검증 에러 메시지 객체

### 실시간 검증
useEffect를 사용하여 입력값 변경 시 자동 검증:
- 질문/답변 글자 수 체크
- 키워드 개수 제한 (최대 20개)
- 우선순위 범위 검증 (-100 ~ 100)

### 키워드 입력 처리
1. 사용자가 키워드 입력 후 Enter 또는 "추가" 버튼 클릭
2. 글자 수 검증 (2~50자)
3. 중복 체크
4. keywords 배열에 추가
5. 입력 필드 초기화

### 폼 제출 검증
최종 제출 시 다시 한번 모든 필드 검증:
- 필수 필드 (question, answer) 존재 여부
- 글자 수 범위
- 에러 객체가 비어있는지 확인

## 접근성

### 키보드 지원
- **Tab**: 폼 필드 간 이동
- **Enter**: 키워드 입력 필드에서 키워드 추가
- **Enter**: 폼 제출 (포커스가 제출 버튼에 있을 때)

### 스크린 리더
- 모든 입력 필드에 `label` 연결 (`htmlFor`, `id`)
- 필수 필드에 `<span className="text-red-500">*</span>` 표시
- 키워드 삭제 버튼에 `aria-label` 제공 ("키워드명 삭제")

### 에러 메시지
- 각 필드 아래에 에러 메시지 표시 (빨간색)
- 실시간 글자 수 표시 (우측 하단)

## 스타일링
- **Tailwind CSS** 사용
- 입력 필드: border-gray-300, focus:ring-2 focus:ring-blue-500
- 에러 상태: border-red-500, text-red-500
- 키워드 태그: bg-blue-100, text-blue-800, rounded-full
- 버튼: 취소(border-gray-300), 제출(bg-blue-500)

## 주의사항
- **XSS 방지**: 입력값은 maxLength로 제한, 백엔드에서 추가로 sanitize 처리
- **any 타입 사용**: onSubmit에서 CreateTemplateDto와 UpdateTemplateDto 타입 충돌을 피하기 위해 any 사용 (백엔드 검증으로 안전성 보장)
- **키워드 입력**: Enter 키와 버튼 클릭 모두 지원 (UX 향상)
- **비활성화 상태**: isSubmitting이 true이면 모든 입력 필드와 버튼 disabled

## 개선 가능 사항
- [ ] 답변 미리보기 기능 (Markdown 렌더링)
- [ ] 키워드 자동완성 제안 (과거 사용 키워드 기반)
- [ ] 폼 변경 감지 및 저장 안내 모달
