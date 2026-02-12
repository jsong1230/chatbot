# LanguageToggle 컴포넌트

## 용도

사용자가 채팅 UI의 언어를 한국어와 영어로 전환할 수 있는 토글 버튼 컴포넌트입니다. F-10 다국어 지원 기능의 핵심 UI 요소로, 언어 전환 시 UI 텍스트를 즉시 변경하고, 서버에 대화 언어 변경을 요청합니다.

## Props

```typescript
interface LanguageToggleProps {
  conversationId: string | null;       // 현재 대화 ID (null이면 신규 대화)
  onLanguageChange?: (language: Language) => void;  // 언어 변경 시 콜백
}
```

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `conversationId` | `string \| null` | Yes | 현재 대화 ID. 신규 대화인 경우 `null` |
| `onLanguageChange` | `(language: Language) => void` | No | 언어 변경 성공 시 호출되는 콜백 함수 |

## 사용 예시

```tsx
import LanguageToggle from '@/components/chat/LanguageToggle';

function ChatWindow() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ko');

  const handleLanguageChange = (newLanguage: Language) => {
    setCurrentLanguage(newLanguage);
    // 추가 로직 (예: 분석 이벤트 전송)
  };

  return (
    <div>
      <LanguageToggle
        conversationId={conversationId}
        onLanguageChange={handleLanguageChange}
      />
      {/* 나머지 채팅 UI */}
    </div>
  );
}
```

## 동작 방식

### 1. 언어 전환 로직

- **버튼 클릭 시**:
  1. 현재 언어를 반대 언어로 전환 (`ko` ↔ `en`)
  2. `LanguageContext`를 통해 UI 언어 즉시 변경 (localStorage 저장)
  3. `conversationId`가 있으면 서버에 언어 변경 API 호출
  4. 성공 시 토스트 메시지 표시 및 콜백 호출
  5. 실패 시 UI 언어 롤백 및 에러 메시지 표시

### 2. 신규 대화 vs 기존 대화

- **신규 대화** (`conversationId === null`):
  - UI 언어만 변경 (서버 API 호출 없음)
  - 다음 메시지 전송 시 백엔드가 자동으로 언어 감지

- **기존 대화** (`conversationId !== null`):
  - UI 언어 변경 + 서버 API 호출 (`PATCH /api/conversations/:id/language`)
  - 이후 메시지는 변경된 언어로 답변 생성

### 3. API 에러 처리

- API 호출 실패 시 UI 언어를 원래 언어로 롤백
- 사용자에게 에러 메시지 표시 (다국어 지원)

## 상태 처리

### Context 의존성

- `useLanguage()` 훅을 통해 `LanguageContext`에 접근
- 전역 언어 상태 관리 (브라우저 새로고침 시에도 유지)

### localStorage

- 언어 선택 시 `localStorage.setItem('language', newLanguage)` 자동 저장
- 페이지 새로고침 후에도 선택한 언어 유지

## 접근성

- **aria-label**: 언어 전환 버튼에 현재 언어와 전환될 언어 표시
  - 한국어 상태: `"언어 변경 (한국어 → English)"`
  - 영어 상태: `"Change Language (English → 한국어)"`

- **시각적 표시**:
  - 🌐 아이콘으로 언어 관련 버튼임을 표시
  - 현재 언어 코드 표시 (KO 또는 EN)
  - 호버 시 배경색 변경 (시각적 피드백)

## 스타일링

```tsx
<button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
  <span className="text-lg">🌐</span>
  <span className="hidden sm:inline">{language === 'ko' ? 'KO' : 'EN'}</span>
</button>
```

- **반응형 디자인**: 작은 화면에서는 언어 코드 숨김 (아이콘만 표시)
- **일관된 디자인**: 기존 버튼 스타일과 동일 (border, rounded-lg, hover 효과)

## 에러 처리

| 에러 상황 | 처리 방식 |
|----------|----------|
| API 호출 실패 | UI 언어 롤백, 에러 토스트 표시 |
| 네트워크 오류 | 재시도 없음, 사용자에게 안내 |
| 권한 오류 (403) | 에러 메시지 표시 (서버 응답 사용) |

## 관련 파일

- `frontend/contexts/LanguageContext.tsx` - 언어 상태 관리 Context
- `frontend/hooks/useLanguage.ts` - 언어 상태 접근 훅
- `frontend/hooks/useTranslation.ts` - 번역 메시지 접근 훅
- `frontend/lib/chat-api.ts` - 언어 변경 API 함수 (`changeConversationLanguage`)
- `frontend/types/language.types.ts` - Language 타입 정의

## 테스트 시나리오

1. **언어 토글 기본 동작**:
   - 버튼 클릭 시 UI 언어 즉시 변경 확인
   - localStorage에 저장 확인

2. **신규 대화 시**:
   - API 호출 없이 UI 언어만 변경 확인

3. **기존 대화 시**:
   - API 호출 성공 시 토스트 메시지 표시 확인
   - API 호출 실패 시 롤백 및 에러 메시지 확인

4. **브라우저 새로고침**:
   - 선택한 언어 유지 확인 (localStorage)

5. **접근성**:
   - 키보드로 버튼 접근 및 실행 가능 확인
   - aria-label이 올바르게 표시되는지 확인

## 주의사항

- `conversationId`가 변경되어도 컴포넌트가 재렌더링되지 않으면 이전 ID로 API 호출할 수 있으므로, 부모 컴포넌트에서 최신 `conversationId`를 전달해야 함
- 언어 변경은 이후 메시지부터 적용되며, 기존 메시지는 그대로 유지됨 (설계 결정)
- 다국어 메시지 키가 누락되면 키 자체가 표시되므로, 번역 리소스 파일 완전성 확인 필요
