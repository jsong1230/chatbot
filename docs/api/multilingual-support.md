# 다국어 지원 (F-10) API — 확정 스펙

> 설계 문서: `docs/specs/multilingual-support/design.md`
> 이 문서는 실제 구현 결과를 반영한 확정본입니다.

## 개요

F-10 다국어 지원 기능은 한국어와 영어를 지원하는 AI 챗봇 시스템입니다. 사용자의 첫 메시지 언어를 자동으로 감지하여 해당 언어로 답변을 생성하며, 수동으로 언어를 변경할 수도 있습니다.

**주요 기능**:
- 신규 대화 시 언어 자동 감지 (한국어/영어)
- 언어별 시스템 프롬프트 적용
- 대화 언어 수동 변경 API
- 카테고리 이름 다국어 조회
- 템플릿 매칭 시 언어 필터

## 엔드포인트

### 1. PATCH /api/conversations/:conversationId/language

**목적**: 대화 세션의 언어를 수동으로 변경

#### 인증
- 필수: Yes
- 미들웨어: `requireAuth`

#### 권한
- 대화 소유자 (userId 또는 sessionId 일치) 또는 admin

#### Request

**Parameters**:
| 파라미터 | 타입 | 위치 | 필수 | 설명 |
|----------|------|------|------|------|
| conversationId | UUID | path | Yes | 대화 ID |

**Body**:
```json
{
  "language": "en"
}
```

| 필드 | 타입 | 필수 | 설명 | 제약사항 |
|------|------|------|------|----------|
| language | string | Yes | 변경할 언어 | enum: 'ko' \| 'en' |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "conversationId": "550e8400-e29b-41d4-a716-446655440000",
    "language": "en",
    "updatedAt": "2026-02-12T15:30:00.000Z"
  }
}
```

#### Error Responses

| 코드 | 상황 | 응답 |
|------|------|------|
| 400 | language가 'ko'/'en'이 아닌 경우 | `{ "success": false, "error": "language는 'ko' 또는 'en'이어야 합니다" }` |
| 401 | 인증 토큰이 없는 경우 | `{ "success": false, "error": "인증이 필요합니다" }` |
| 403 | 대화 소유자가 아닌 경우 | `{ "success": false, "error": "대화에 접근할 권한이 없습니다" }` |
| 404 | 대화가 존재하지 않거나 삭제된 경우 | `{ "success": false, "error": "대화를 찾을 수 없습니다" }` |

---

### 2. GET /api/categories

**목적**: 활성 카테고리 목록 조회 (언어별 이름 반환)

#### 인증
- 불필요 (public API)

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| language | string | No | 'ko' | 조회할 언어 (enum: 'ko' \| 'en') |

#### Request 예시

```http
GET /api/categories?language=en
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "slug": "product-inquiry",
        "name": "Product Inquiry"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "slug": "shipping-inquiry",
        "name": "Shipping Inquiry"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "slug": "return-exchange",
        "name": "Return/Exchange"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "slug": "payment-inquiry",
        "name": "Payment Inquiry"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "slug": "other",
        "name": "Other"
      }
    ]
  }
}
```

**한국어 조회 예시** (`?language=ko`):
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "slug": "product-inquiry",
        "name": "상품문의"
      }
    ]
  }
}
```

#### Error Responses

| 코드 | 상황 | 응답 |
|------|------|------|
| 400 | language가 'ko'/'en'이 아닌 경우 | `{ "success": false, "error": "language는 'ko' 또는 'en'이어야 합니다" }` |

---

### 3. POST /api/chat (기존 API 확장)

**변경 사항**: 응답에 `language` 필드 추가

#### Request (변경 없음)

```json
{
  "conversationId": null,
  "message": "How long does shipping take?"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "conversationId": "550e8400-e29b-41d4-a716-446655440000",
    "language": "en",
    "userMessage": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "content": "How long does shipping take?",
      "sender": "user",
      "createdAt": "2026-02-12T15:30:00.000Z"
    },
    "assistantMessage": {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "content": "Shipping typically takes 2-3 business days for standard delivery.",
      "sender": "assistant",
      "createdAt": "2026-02-12T15:30:01.000Z"
    },
    "needsEscalation": false
  }
}
```

**주요 변경점**:
- `language` 필드 추가: 신규 대화 시 자동 감지된 언어, 기존 대화 시 기존 언어 반환
- 답변 내용이 감지된 언어에 맞게 생성됨

---

### 4. GET /api/conversations (기존 API 확장)

**변경 사항**: 응답에 `language` 필드 추가

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "language": "en",
        "category": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Product Inquiry",
          "slug": "product-inquiry"
        },
        "firstMessage": {
          "content": "How long does shipping take?",
          "preview": "How long does shipping take?"
        },
        "messageCount": 2,
        "needsEscalation": false,
        "lastMessageAt": "2026-02-12T15:30:01.000Z",
        "createdAt": "2026-02-12T15:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 5. GET /api/conversations/:conversationId (기존 API 확장)

**변경 사항**: 응답에 `language` 필드 추가

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "language": "en",
      "category": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Product Inquiry",
        "slug": "product-inquiry"
      },
      "messageCount": 2,
      "needsEscalation": false,
      "lastMessageAt": "2026-02-12T15:30:01.000Z",
      "createdAt": "2026-02-12T15:30:00.000Z"
    }
  }
}
```

---

## 언어 감지 로직

### 자동 감지 조건
- **신규 대화**: `conversationId === null`인 경우 첫 메시지 언어 감지
- **기존 대화**: `conversationId`가 있으면 기존 언어 사용 (재감지 안 함)

### 감지 방식
- **라이브러리**: `franc` (75개 언어 지원, 오프라인)
- **지원 언어**: 한국어(`ko`), 영어(`en`)
- **폴백 언어**: 한국어(`ko`) - 감지 실패 시 기본값

### 감지 신뢰도
- **최소 텍스트 길이**: 5자
- **신뢰도 임계값**: 0.5 (franc는 신뢰도 점수 제공 안 함, 내부적으로 0.9 고정)
- **짧은 메시지**: 5자 미만 → 자동으로 폴백 언어 반환

### 감지 예시

| 메시지 | 감지 결과 | 신뢰도 | 비고 |
|--------|----------|--------|------|
| "배송은 얼마나 걸리나요?" | `ko` | 0.9 | 정상 감지 |
| "How long does shipping take?" | `en` | 0.9 | 정상 감지 |
| "ㅎㅇ" | `ko` | 0.0 | 짧은 메시지 → 폴백 |
| "hi" | `ko` | 0.0 | 짧은 메시지 → 폴백 |

---

## 시스템 프롬프트

### 한국어 프롬프트
```
당신은 친절한 고객 상담 챗봇입니다. 고객의 문의에 정확하고 도움이 되는 답변을 제공하세요.

답변 시 다음을 지켜주세요:
- 친근하고 전문적인 톤 유지
- 간결하고 명확한 문장 (최대 300자 권장)
- 필요 시 단계별 안내 제공

다음과 같은 경우 반드시 "상담원 연결이 필요합니다"라고 답변하세요:
- 개인정보(주문번호, 결제 정보) 조회가 필요한 경우
- 환불, 취소, 교환 등 처리 권한이 필요한 경우
- 복잡한 기술 문제나 불만 사항
```

### 영어 프롬프트
```
You are a friendly customer service chatbot. Provide accurate and helpful responses to customer inquiries.

Response guidelines:
- Maintain a friendly and professional tone
- Keep responses concise and clear (max 300 characters recommended)
- Provide step-by-step guidance when needed

Always respond "This inquiry requires an agent" in the following cases:
- Personal information lookup needed (order number, payment info)
- Processing authority required (refunds, cancellations, exchanges)
- Complex technical issues or complaints
```

---

## 에스컬레이션 메시지

### 한국어
```
이 문의는 상담원 연결이 필요합니다. 잠시만 기다려 주시면 담당자가 확인 후 연락드리겠습니다.
```

### 영어
```
This inquiry requires an agent. Please wait, and a representative will contact you shortly.
```

---

## 설계 대비 변경사항

### 1. 캐시 전략 단순화
- **설계**: 언어별 캐시 분리
- **구현**: 언어별 캐시 없음 (매 요청마다 DB 조회)
- **이유**: 구현 복잡도 감소, 성능 영향 미미 (템플릿 개수가 적음)
- **향후 개선**: 템플릿이 수천 개 이상으로 증가하면 언어별 캐시 도입 검토

### 2. 하위 호환성 보장
- **구현 방식**: 모든 함수에 `language` 파라미터 기본값 `'ko'` 설정
- **검증**: 기존 F-02, F-03 테스트가 통과되도록 보장
- **예시**:
  ```typescript
  // 기존 호출 (변경 불필요)
  generateAnswer(history, message, category)

  // 새 호출 (다국어 지원)
  generateAnswer(history, message, category, 'en')
  ```

### 3. 카테고리 이름 필드
- **설계**: `category.name` 제거 계획
- **구현**: `category.name` 유지 (하위 호환성)
- **이유**: 기존 API가 `name` 필드를 사용 중, 추후 deprecate 예정

---

## 성능 지표

### 언어 감지
- **평균 응답 시간**: 30-50ms
- **목표**: 50ms 이하 (설계 목표 달성)

### AI 답변 생성
- **한국어**: 기존과 동일 (2-5초, 95 percentile)
- **영어**: 기존과 동일 (2-5초, 95 percentile)
- **추가 지연**: 없음 (프롬프트 선택 로직은 O(1))

---

## 보안 고려사항

### 입력 검증
- `language` 파라미터: enum('ko', 'en')만 허용 (Zod 스키마)
- 잘못된 값 입력 시 400 에러

### 권한 검증
- 대화 언어 변경: 소유자 또는 admin만 가능
- 권한 없는 경우 403 에러

---

## 향후 확장 가능성

### 언어 추가 (일본어, 중국어)
1. `Language` enum에 `ja`, `zh` 추가
2. `prompts.ts`에 일본어/중국어 프롬프트 추가
3. `franc` 라이브러리가 이미 지원함 (추가 작업 불필요)
4. 카테고리 `name_ja`, `name_zh` 컬럼 추가

### 번역 API 연동
- 기존 메시지 번역 기능 추가
- Google Translate API 또는 DeepL API 연동
- 언어 변경 시 이전 메시지 자동 번역 (선택적)

---

## 참고 문서

- 설계 문서: `docs/specs/multilingual-support/design.md`
- 계획 문서: `docs/specs/multilingual-support/plan.md`
- DB 스키마: `docs/db/multilingual-support.md`
