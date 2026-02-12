# 답변 템플릿 관리 (F-07) API — 확정 스펙

> 설계 문서: docs/specs/faq-template-management/design.md
> 이 문서는 실제 구현 결과를 반영한 확정본입니다.

## 개요

관리자가 자주 묻는 질문(FAQ)의 답변을 직접 등록하고 관리하여, AI 답변 품질을 개선하고 일관성 있는 답변을 제공합니다. 템플릿 매칭 실패 시 기존 OpenAI API 답변 생성 로직으로 자동 폴백합니다.

## 공통 사항

### Base URL
```
http://localhost:4000/api
```

### 인증
모든 엔드포인트는 JWT 토큰 기반 인증이 필요하며, `admin` 역할만 접근 가능합니다.

```
Authorization: Bearer {access_token}
```

### Rate Limiting
관리자당 분당 30회 요청 제한

### 공통 응답 형식
```json
{
  "success": true | false,
  "data": { ... } | null,
  "error": "에러 메시지" | null
}
```

---

## 엔드포인트

### 1. POST /api/templates
템플릿 생성 (관리자 전용)

#### Headers
| 헤더 | 필수 | 설명 |
|------|------|------|
| Authorization | Yes | Bearer {access_token} |
| Content-Type | Yes | application/json |

#### Request Body
```json
{
  "question": "배송 기간이 얼마나 걸리나요?",
  "answer": "일반 배송은 영업일 기준 2-3일 소요됩니다.",
  "keywords": ["배송", "기간", "소요"],
  "categoryId": "uuid-1234",
  "priority": 10,
  "isActive": true
}
```

#### Request Body Schema
| 필드 | 타입 | 필수 | 제약조건 | 설명 |
|------|------|------|----------|------|
| question | string | Yes | 10~500자, 중복 불가 (대소문자 무시) | 질문 패턴 |
| answer | string | Yes | 10~2000자 | 답변 내용 |
| keywords | string[] | No | 최대 20개, 각 2~50자, 기본값: [] | 매칭용 키워드 배열 |
| categoryId | string (UUID) \| null | No | 유효한 category.id 또는 null | 특정 카테고리에만 적용 (null이면 전체) |
| priority | number | No | -100 ~ 100, 기본값: 0 | 우선순위 (높을수록 먼저 매칭) |
| isActive | boolean | No | 기본값: true | 활성화 여부 |

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid-5678",
    "question": "배송 기간이 얼마나 걸리나요?",
    "answer": "일반 배송은 영업일 기준 2-3일 소요됩니다.",
    "keywords": ["배송", "기간", "소요"],
    "categoryId": "uuid-1234",
    "categoryName": "배송문의",
    "priority": 10,
    "isActive": true,
    "usageCount": 0,
    "lastUsedAt": null,
    "createdAt": "2026-02-12T12:00:00.000Z",
    "updatedAt": "2026-02-12T12:00:00.000Z"
  }
}
```

#### Error Responses
| 코드 | 상황 | 응답 예시 |
|------|------|----------|
| 400 | 검증 실패 (글자 수, 타입) | `{ "success": false, "error": "question은 10자 이상 500자 이하여야 합니다" }` |
| 400 | keywords 개수 초과 | `{ "success": false, "error": "keywords는 최대 20개까지 가능합니다" }` |
| 401 | 토큰 없음 또는 만료 | `{ "success": false, "error": "토큰이 제공되지 않았습니다" }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |
| 404 | categoryId 없음 | `{ "success": false, "error": "카테고리를 찾을 수 없습니다" }` |
| 409 | 중복 질문 | `{ "success": false, "error": "이미 등록된 질문입니다" }` |
| 429 | Rate Limit 초과 | `{ "success": false, "error": "너무 많은 요청이 발생했습니다..." }` |

---

### 2. GET /api/templates
템플릿 목록 조회 (관리자 전용)

#### Headers
| 헤더 | 필수 | 설명 |
|------|------|------|
| Authorization | Yes | Bearer {access_token} |

#### Query Parameters
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| categoryId | string (UUID) | No | - | 카테고리별 필터 |
| isActive | boolean | No | - | 활성화 상태 필터 (true/false) |
| search | string | No | - | 질문/답변 내용 검색 (부분 일치, 최대 200자) |
| page | number | No | 1 | 페이지 번호 (최소 1) |
| limit | number | No | 20 | 페이지 크기 (1~100) |

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid-5678",
        "question": "배송 기간이 얼마나 걸리나요?",
        "answer": "일반 배송은 영업일 기준 2-3일...",
        "keywords": ["배송", "기간"],
        "categoryId": "uuid-1234",
        "categoryName": "배송문의",
        "priority": 10,
        "isActive": true,
        "usageCount": 123,
        "lastUsedAt": "2026-02-12T10:00:00.000Z",
        "createdAt": "2026-01-01T12:00:00.000Z",
        "updatedAt": "2026-02-12T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### 정렬 규칙
1. priority (내림차순)
2. createdAt (최신순)

#### Error Responses
| 코드 | 상황 | 응답 예시 |
|------|------|----------|
| 400 | 잘못된 파라미터 | `{ "success": false, "error": "limit은 1~100 사이여야 합니다" }` |
| 401 | 토큰 없음 또는 만료 | `{ "success": false, "error": "토큰이 제공되지 않았습니다" }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |

---

### 3. GET /api/templates/:id
템플릿 단일 조회 (관리자 전용)

#### Headers
| 헤더 | 필수 | 설명 |
|------|------|------|
| Authorization | Yes | Bearer {access_token} |

#### Path Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string (UUID) | Yes | 템플릿 ID |

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid-5678",
    "question": "배송 기간이 얼마나 걸리나요?",
    "answer": "일반 배송은 영업일 기준 2-3일 소요됩니다.",
    "keywords": ["배송", "기간"],
    "categoryId": "uuid-1234",
    "categoryName": "배송문의",
    "priority": 10,
    "isActive": true,
    "usageCount": 123,
    "lastUsedAt": "2026-02-12T10:00:00.000Z",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-02-12T10:00:00.000Z"
  }
}
```

#### Error Responses
| 코드 | 상황 | 응답 예시 |
|------|------|----------|
| 400 | 잘못된 ID 형식 | `{ "success": false, "error": "템플릿 ID가 필요합니다" }` |
| 401 | 토큰 없음 또는 만료 | `{ "success": false, "error": "토큰이 제공되지 않았습니다" }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |
| 404 | 템플릿 없음 | `{ "success": false, "error": "템플릿을 찾을 수 없습니다" }` |

---

### 4. PUT /api/templates/:id
템플릿 수정 (관리자 전용)

#### Headers
| 헤더 | 필수 | 설명 |
|------|------|------|
| Authorization | Yes | Bearer {access_token} |
| Content-Type | Yes | application/json |

#### Path Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string (UUID) | Yes | 템플릿 ID |

#### Request Body
```json
{
  "question": "배송 기간이 얼마나 걸리나요?",
  "answer": "일반 배송은 영업일 기준 2-3일 소요됩니다.",
  "keywords": ["배송", "기간", "소요"],
  "categoryId": "uuid-1234",
  "priority": 15,
  "isActive": true
}
```

#### Request Body Schema
| 필드 | 타입 | 필수 | 제약조건 | 설명 |
|------|------|------|----------|------|
| question | string | No | 10~500자, 중복 불가 (대소문자 무시) | 질문 패턴 |
| answer | string | No | 10~2000자 | 답변 내용 |
| keywords | string[] | No | 최대 20개, 각 2~50자 | 매칭용 키워드 배열 |
| categoryId | string (UUID) \| null | No | 유효한 category.id 또는 null | 특정 카테고리에만 적용 |
| priority | number | No | -100 ~ 100 | 우선순위 |
| isActive | boolean | No | - | 활성화 여부 |

**참고**: 모든 필드가 선택적(optional)이며, 제공된 필드만 업데이트됩니다.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid-5678",
    "question": "배송 기간이 얼마나 걸리나요?",
    "answer": "일반 배송은 영업일 기준 2-3일 소요됩니다.",
    "keywords": ["배송", "기간", "소요"],
    "categoryId": "uuid-1234",
    "categoryName": "배송문의",
    "priority": 15,
    "isActive": true,
    "usageCount": 123,
    "lastUsedAt": "2026-02-12T10:00:00.000Z",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-02-12T12:30:00.000Z"
  }
}
```

#### Error Responses
| 코드 | 상황 | 응답 예시 |
|------|------|----------|
| 400 | 검증 실패 | `{ "success": false, "error": "answer는 10자 이상이어야 합니다" }` |
| 401 | 토큰 없음 또는 만료 | `{ "success": false, "error": "토큰이 제공되지 않았습니다" }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |
| 404 | 템플릿 없음 | `{ "success": false, "error": "템플릿을 찾을 수 없습니다" }` |
| 409 | 중복 질문 (다른 템플릿과) | `{ "success": false, "error": "이미 등록된 질문입니다" }` |

---

### 5. DELETE /api/templates/:id
템플릿 삭제 (Soft Delete, 관리자 전용)

#### Headers
| 헤더 | 필수 | 설명 |
|------|------|------|
| Authorization | Yes | Bearer {access_token} |

#### Path Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string (UUID) | Yes | 템플릿 ID |

#### Response (204 No Content)
본문 없음

#### Error Responses
| 코드 | 상황 | 응답 예시 |
|------|------|----------|
| 400 | 잘못된 ID 형식 | `{ "success": false, "error": "템플릿 ID가 필요합니다" }` |
| 401 | 토큰 없음 또는 만료 | `{ "success": false, "error": "토큰이 제공되지 않았습니다" }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |
| 404 | 템플릿 없음 또는 이미 삭제됨 | `{ "success": false, "error": "템플릿을 찾을 수 없습니다" }` |

**참고**: Soft Delete 방식을 사용하며, 삭제된 템플릿은 DB에 남아있으나 `deletedAt` 필드가 설정되어 조회 및 매칭에서 제외됩니다.

---

## F-03 통합 (템플릿 매칭 로직)

### 개요
F-03(AI 기반 자동 답변) 기능에 템플릿 매칭 로직이 통합되어, 사용자 메시지에 템플릿 키워드가 포함되면 AI 호출 없이 즉시 템플릿 답변을 반환합니다.

### 매칭 알고리즘
1. **메시지 정규화**: 사용자 메시지를 소문자로 변환하고 공백 정규화
2. **활성 템플릿 조회**: `isActive=true`, `deletedAt=null`인 템플릿만 조회 (메모리 캐시 활용, TTL 5분)
3. **키워드 매칭**: 템플릿의 모든 키워드가 메시지에 포함되어야 매칭 성공
4. **점수 계산**:
   ```
   점수 = (매칭된 키워드 개수 × 10) + priority + (카테고리 일치 시 +5)
   ```
5. **임계값 필터링**: 점수가 10점 이상인 템플릿만 후보로 선정
6. **최고 점수 선택**: 점수가 가장 높은 템플릿 선택 (동점이면 최신 템플릿 우선)
7. **사용 통계 업데이트**: 매칭 성공 시 `usageCount` 증가, `lastUsedAt` 업데이트 (비동기)

### 폴백 전략
- **템플릿 매칭 실패 조건**:
  - 매칭된 템플릿이 없음
  - 매칭 점수가 10점 미만
  - 템플릿 조회 중 에러 발생
- **폴백 동작**: F-03의 `generateAnswer()` 함수 호출 (기존 OpenAI API 로직)
- **에스컬레이션 판단**: 폴백 시 기존 로직 유지 (`needsEscalation` 판단)

### 메시지 메타데이터 로깅

#### 템플릿 매칭 성공 시
```json
{
  "source": "template",
  "templateId": "uuid-5678",
  "matchScore": 25,
  "matchTimeMs": 12
}
```

#### 템플릿 매칭 실패 (AI 폴백) 시
```json
{
  "source": "openai",
  "model": "gpt-3.5-turbo",
  "responseTimeMs": 2340,
  "fallbackReason": "템플릿 매칭 실패"
}
```

#### AI 폴백 실패 (시스템 메시지) 시
```json
{
  "source": "system",
  "error": "OpenAI API 호출 실패",
  "responseTimeMs": 5000
}
```

### 성능 목표
- **템플릿 매칭 시간**: 50ms 이내 (메모리 캐시 활용)
- **전체 응답 시간**: 템플릿 매칭 성공 시 1초 이내 (AI 호출 생략)

---

## 설계 대비 변경사항

**변경 없음**: 설계서(design.md)와 100% 일치하게 구현되었습니다.

---

## 참고 자료
- 설계 문서: `docs/specs/faq-template-management/design.md`
- DB 스키마 문서: `docs/db/faq-template-management.md`
- Prisma 스키마: `backend/prisma/schema.prisma`
- 서비스 로직: `backend/src/services/template.service.ts`
- F-03 통합 코드: `backend/src/services/chat.service.ts`
