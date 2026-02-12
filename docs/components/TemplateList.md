# TemplateList

## 용도
FAQ 템플릿 목록을 테이블 형태로 표시하고, 편집/삭제/활성화 토글 기능을 제공하는 컴포넌트입니다.

## Props

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| templates | Template[] | Yes | - | 템플릿 목록 배열 |
| onEdit | (template: Template) => void | Yes | - | 편집 버튼 클릭 핸들러 |
| onDelete | (template: Template) => void | Yes | - | 삭제 버튼 클릭 핸들러 |
| onToggleActive | (template: Template) => void | Yes | - | 활성 상태 토글 핸들러 |
| isLoading | boolean | No | false | 로딩 상태 (버튼 비활성화) |

## 사용 예시

```tsx
import { TemplateList } from '@/components/templates/TemplateList';
import { updateTemplate, deleteTemplate } from '@/lib/api/template';

function TemplatesPage() {
  const [templates, setTemplates] = useState([]);

  const handleEdit = (template) => {
    router.push(`/admin/templates/${template.id}/edit`);
  };

  const handleDelete = async (template) => {
    if (confirm(`"${template.question}" 템플릿을 삭제하시겠습니까?`)) {
      await deleteTemplate(template.id);
      loadData(); // 목록 새로고침
    }
  };

  const handleToggleActive = async (template) => {
    await updateTemplate(template.id, { isActive: !template.isActive });
    loadData(); // 목록 새로고침
  };

  return (
    <TemplateList
      templates={templates}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onToggleActive={handleToggleActive}
      isLoading={loading}
    />
  );
}
```

## 테이블 컬럼

| 컬럼명 | 설명 | 표시 형식 |
|--------|------|----------|
| 질문 | 템플릿 질문 (최대 2줄) + 키워드 태그 (최대 3개 + 나머지 개수) | line-clamp-2, 태그 (bg-blue-100) |
| 카테고리 | 카테고리명 (없으면 "전체") | 텍스트 |
| 키워드 수 | 키워드 배열 길이 | 숫자 |
| 우선순위 | priority 값 | 배지 (양수: 초록, 음수: 빨강, 0: 회색) |
| 사용 횟수 | usageCount | 숫자 |
| 활성 상태 | isActive 토글 스위치 | 토글 버튼 (파랑/회색) |
| 작업 | 편집/삭제 버튼 | 버튼 2개 |

## 상태 처리

### 빈 목록 처리
templates 배열이 비어있으면 "등록된 템플릿이 없습니다" 메시지 표시

### 로딩 상태
isLoading이 true이면 모든 버튼 비활성화 (편집, 삭제, 토글)

### 키워드 표시
- 키워드가 없으면 표시하지 않음
- 키워드가 3개 이하면 모두 표시
- 키워드가 4개 이상이면 처음 3개 + "+N" 표시

### 우선순위 배지 색상
- priority > 0: bg-green-100 text-green-800
- priority < 0: bg-red-100 text-red-800
- priority === 0: bg-gray-100 text-gray-800

## 접근성

### 키보드 지원
- **Tab**: 버튼 간 이동
- **Enter**: 포커스된 버튼 실행

### 스크린 리더
- 토글 버튼에 `aria-label` 제공 ("템플릿 활성화" 또는 "템플릿 비활성화")
- 테이블에 적절한 시맨틱 HTML 사용 (`<table>`, `<thead>`, `<tbody>`, `<th>`)

## 스타일링
- **Tailwind CSS** 사용
- 테이블: bg-white, rounded-lg shadow
- 헤더: bg-gray-50, uppercase, text-xs
- 행 호버: hover:bg-gray-50 transition
- 버튼: 편집(text-blue-600, hover:bg-blue-50), 삭제(text-red-600, hover:bg-red-50)

## 반응형 디자인
- **overflow-x-auto**: 모바일에서 테이블 가로 스크롤
- 테이블 최소 너비: 자동 (모든 컬럼 표시)

## 주의사항
- **line-clamp-2**: 질문이 2줄을 넘으면 "..." 표시 (긴 질문 대응)
- **버튼 비활성화**: isLoading이 true이면 모든 인터랙션 차단
- **삭제 확인**: 삭제 버튼 클릭 시 부모 컴포넌트에서 confirm 모달 처리

## 개선 가능 사항
- [ ] 정렬 기능 (컬럼 헤더 클릭 시)
- [ ] 일괄 삭제 체크박스
- [ ] 템플릿 상세 보기 모달 (질문 클릭 시)
- [ ] 답변 미리보기 툴팁
