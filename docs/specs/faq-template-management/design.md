# 답변 템플릿 관리 (F-07) — 기술 설계서

## 1. 참조
- **요구사항 분석서**: docs/specs/faq-template-management/requirements.md
- **관련 기능**:
  - F-02 (문의 자동 분류): category 테이블 연동
  - F-03 (AI 기반 자동 답변): chat.service.ts 수정 필요

---

## 2. 아키텍처 개요

### 2.1 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐      ┌──────────────────────────┐    │
│  │ 관리자 템플릿    │      │ 사용자 채팅창            │    │
│  │ 관리 페이지      │      │ (템플릿 답변 수신)       │    │
│  │ /admin/templates │      │ /chat                    │    │
│  └─────────┬────────┘      └──────────┬───────────────┘    │
│            │                           │                     │
│            │ POST/GET/PUT/DELETE       │ POST                │
│            │ /api/templates            │ /api/chat           │
└────────────┼───────────────────────────┼─────────────────────┘
             │                           │
             │                           │
┌────────────┼───────────────────────────┼─────────────────────┐
│            │    Backend (Express.js)   │                     │
├────────────┼───────────────────────────┼─────────────────────┤
│  ┌─────────▼─────────────┐    ┌────────▼──────────────────┐ │
│  │ TemplateController    │    │ ChatController            │ │
│  │ - POST /templates     │    │ - POST /chat              │ │
│  │ - GET /templates      │    │                           │ │
│  │ - PUT /templates/:id  │    │                           │ │
│  │ - DELETE /templates   │    │                           │ │
│  └─────────┬─────────────┘    └────────┬──────────────────┘ │
│            │                           │                     │
│  ┌─────────▼─────────────┐    ┌────────▼──────────────────┐ │
│  │ TemplateService       │◀───│ ChatService               │ │
│  │ - createTemplate()    │    │ - processMessage()        │ │
│  │ - getTemplates()      │    │   ├─ matchTemplate() ◀───┤ │
│  │ - updateTemplate()    │    │   └─ generateAnswer()     │ │
│  │ - deleteTemplate()    │    │     (폴백)                 │ │
│  │ - matchTemplate()     │    │                           │ │
│  │   (키워드 매칭)        │    │                           │ │
│  └─────────┬─────────────┘    └───────────────────────────┘ │
│            │                                                  │
│  ┌─────────▼──────────────────────────────────────────────┐ │
│  │                 Prisma ORM                             │ │
│  └─────────┬──────────────────────────────────────────────┘ │
└────────────┼──────────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────────┐
│                    PostgreSQL DB                              │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐   ┌─────────────────┐   ┌────────────┐ │
│  │ faq_template    │   │ category        │   │ message    │ │
│  │ - id (PK)       │   │ - id (PK)       │   │ - id (PK)  │ │
│  │ - question      │   │ - name          │   │ - content  │ │
│  │ - answer        │   │ - slug          │   │ - metadata │ │
│  │ - keywords      │   └────────▲────────┘   └────────────┘ │
│  │ - categoryId ───┼────────────┘                            │
│  │ - priority      │                                         │
│  │ - isActive      │                                         │
│  │ - usageCount    │                                         │
│  │ - lastUsedAt    │                                         │
│  └─────────────────┘                                         │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

#### 사용자 메시지 처리 흐름
```
1. 사용자 메시지 전송 → ChatController
2. ChatService.processMessage() 호출
3. TemplateService.matchTemplate() 시도
   ├─ 성공: 템플릿 답변 반환 (AI 호출 생략)
   └─ 실패: OpenAI API 호출 (기존 로직)
4. 메시지 저장 (metadata에 템플릿 매칭 정보 기록)
5. 답변 반환
```

---

## 3. 아키텍처 결정

### 결정 1: 템플릿 매칭 로직 위치

- **선택지**:
  - A) ChatService.processMessage() 내부에 인라인으로 구현
  - B) TemplateService로 분리하여 독립적으로 관리
  - C) 별도의 TemplateMatchingService 생성

- **결정**: **B) TemplateService로 분리**

- **근거**:
  - 템플릿 CRUD와 매칭 로직이 모두 템플릿 도메인에 속함
  - ChatService는 얇게 유지 (단일 책임 원칙)
  - 테스트 작성 용이 (템플릿 매칭 로직만 독립 테스트 가능)
  - 향후 NLP 기반 매칭으로 업그레이드 시 TemplateService만 수정

- **트레이드오프**:
  - 포기: ChatService에서 모든 로직을 볼 수 있는 편의성
  - 얻음: 관심사 분리, 테스트 용이성, 확장성

### 결정 2: 키워드 매칭 알고리즘

- **선택지**:
  - A) 단순 문자열 포함 검사 (includes)
  - B) 정규식 기반 전체 단어 매칭 (\b키워드\b)
  - C) NLP 라이브러리 (형태소 분석, 유사도 계산)

- **결정**: **A) 단순 문자열 포함 검사** (초기 구현), 향후 C로 확장 가능하도록 설계

- **근거**:
  - 요구사항(FR-2.1)에서 "키워드가 포함되면"이라고 명시
  - 성능 목표 50ms 이내 달성 용이 (includes는 O(n) 시간 복잡도)
  - 한국어 형태소 분석 라이브러리(mecab-ko, komoran) 도입 시 추가 의존성 및 설치 복잡도 증가
  - 초기에는 관리자가 키워드를 적절히 설정하면 충분

- **트레이드오프**:
  - 포기: 복잡한 언어 이해 ("배송일"과 "배송 기간"을 동일하게 인식)
  - 얻음: 간단한 구현, 빠른 응답, 의존성 최소화

### 결정 3: 템플릿 매칭 점수 계산 방식

- **선택지**:
  - A) 키워드 개수만 반영 (매칭 개수 × 10점)
  - B) 키워드 개수 + priority + 카테고리 보너스
  - C) TF-IDF 또는 코사인 유사도 기반

- **결정**: **B) 키워드 개수 + priority + 카테고리 보너스**

- **근거**:
  - 요구사항(FR-2.1)에서 priority를 점수에 포함한다고 명시
  - 카테고리가 일치하면 보너스를 주어 정확도 향상 (+5점)
  - 관리자가 우선순위를 조정하여 중요한 FAQ를 상위에 배치 가능

- **점수 계산 공식**:
  ```
  matchScore = (매칭된 키워드 개수 × 10) + priority + (카테고리 일치 시 +5)
  ```

- **예시**:
  - 키워드 2개 매칭, priority 10, 카테고리 일치
    → 점수: (2 × 10) + 10 + 5 = **35점**
  - 키워드 3개 매칭, priority 0, 카테고리 불일치
    → 점수: (3 × 10) + 0 + 0 = **30점**

- **트레이드오프**:
  - 포기: 의미론적 유사도 기반 정확한 매칭
  - 얻음: 간단하고 예측 가능한 점수 체계, 관리자 제어 가능

### 결정 4: 템플릿 조회 성능 최적화

- **선택지**:
  - A) 매번 DB 조회 (SELECT * FROM faq_template WHERE isActive=true)
  - B) 애플리케이션 메모리 캐싱 (Node.js 변수)
  - C) Redis 캐싱

- **결정**: **B) 애플리케이션 메모리 캐싱** (초기 구현), 향후 C로 확장 가능

- **근거**:
  - 템플릿 개수가 100~1,000개 수준으로 메모리 부담 적음 (각 템플릿 ~1KB, 1,000개 = 1MB)
  - 템플릿 수정 빈도가 낮음 (하루 수십 회 이하)
  - 50ms 성능 목표 달성을 위해 DB I/O 제거 필요
  - TTL 5분으로 캐시 무효화 (템플릿 수정 후 최대 5분 반영 지연)

- **캐시 전략**:
  ```typescript
  // 메모리 캐시 (Node.js 프로세스 내)
  let cachedTemplates: Template[] | null = null;
  let cacheExpiry: number = 0;
  const CACHE_TTL = 5 * 60 * 1000; // 5분

  async function getActiveTemplates() {
    if (cachedTemplates && Date.now() < cacheExpiry) {
      return cachedTemplates;
    }

    cachedTemplates = await prisma.faqTemplate.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { priority: 'desc' },
    });
    cacheExpiry = Date.now() + CACHE_TTL;

    return cachedTemplates;
  }
  ```

- **트레이드오프**:
  - 포기: 실시간 템플릿 반영 (최대 5분 지연)
  - 얻음: 50ms 이내 응답, Redis 의존성 제거

### 결정 5: Soft Delete vs Hard Delete

- **선택지**:
  - A) Hard Delete (DB에서 완전 삭제)
  - B) Soft Delete (deletedAt 필드 사용)

- **결정**: **B) Soft Delete**

- **근거**:
  - 요구사항(FR-1.4)에서 "Soft Delete 권장"이라고 명시
  - 템플릿 삭제 후 복구 가능성 보장
  - 삭제된 템플릿의 사용 통계 보존 (분석 목적)

- **트레이드오프**:
  - 포기: DB 저장 공간 절약
  - 얻음: 데이터 복구 가능성, 감사 추적

---

## 4. DB 설계

### 4.1 새 테이블: faq_template

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | String | PK, UUID, NOT NULL | 템플릿 고유 식별자 |
| question | String | NOT NULL, UNIQUE (대소문자 무시) | 질문 패턴 (10~500자) |
| answer | Text | NOT NULL | 답변 내용 (10~2000자) |
| keywords | String[] | ARRAY, NULLABLE | 매칭용 키워드 배열 (최대 20개) |
| categoryId | String | FK → category.id, NULLABLE, ON DELETE SET NULL | 특정 카테고리에만 적용 (null이면 전체) |
| priority | Int | NOT NULL, DEFAULT 0 | 우선순위 (-100 ~ 100) |
| isActive | Boolean | NOT NULL, DEFAULT true | 활성화 여부 |
| usageCount | Int | NOT NULL, DEFAULT 0 | 사용 횟수 (통계용, Could) |
| lastUsedAt | DateTime | NULLABLE | 최근 사용 일시 (통계용, Could) |
| deletedAt | DateTime | NULLABLE | Soft Delete 타임스탬프 |
| createdAt | DateTime | NOT NULL, DEFAULT NOW() | 생성 일시 |
| updatedAt | DateTime | NOT NULL, AUTO UPDATE | 수정 일시 |

### 4.2 인덱스 계획

| 인덱스명 | 컬럼 | 용도 |
|---------|------|------|
| idx_template_is_active | isActive | 활성 템플릿만 조회 (매칭 시) |
| idx_template_category_id | categoryId | 카테고리별 템플릿 필터링 |
| idx_template_priority | priority | 우선순위 정렬 |
| idx_template_deleted_at | deletedAt | Soft Delete 조회 최적화 |
| idx_template_question_unique | LOWER(question) | 중복 질문 방지 (대소문자 무시) |

### 4.3 Prisma 스키마

```prisma
// FAQ 템플릿 테이블 (F-07)
model FaqTemplate {
  id           String    @id @default(uuid())
  question     String    @unique
  answer       String    @db.Text
  keywords     String[]  // PostgreSQL 배열 타입
  categoryId   String?   @map("category_id")
  priority     Int       @default(0)
  isActive     Boolean   @default(true) @map("is_active")
  usageCount   Int       @default(0) @map("usage_count")
  lastUsedAt   DateTime? @map("last_used_at")
  deletedAt    DateTime? @map("deleted_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  category     Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  // 인덱스
  @@index([isActive], name: "idx_template_is_active")
  @@index([categoryId], name: "idx_template_category_id")
  @@index([priority], name: "idx_template_priority")
  @@index([deletedAt], name: "idx_template_deleted_at")

  @@map("faq_template")
}
```

### 4.4 기존 테이블 변경: category

**변경 내용**: 관계 추가만 (컬럼 변경 없음)

```prisma
model Category {
  // ... 기존 필드

  // F-07: 템플릿 관계 추가
  faqTemplates FaqTemplate[]
}
```

### 4.5 기존 테이블 변경: message

**변경 내용**: metadata 필드 활용 (컬럼 추가 없음)

```json
// message.metadata 예시 (템플릿 매칭 성공 시)
{
  "source": "template",
  "templateId": "uuid-1234",
  "matchScore": 25,
  "matchTimeMs": 12
}

// message.metadata 예시 (AI 폴백 시)
{
  "source": "openai",
  "model": "gpt-3.5-turbo",
  "responseTimeMs": 2340,
  "fallbackReason": "템플릿 매칭 실패"
}
```

### 4.6 마이그레이션 계획

**마이그레이션 파일**: `migrations/YYYYMMDDHHMMSS_add_faq_template_table/migration.sql`

```sql
-- 1. faq_template 테이블 생성
CREATE TABLE faq_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question VARCHAR(500) NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  keywords TEXT[], -- PostgreSQL 배열
  category_id UUID REFERENCES category(id) ON DELETE SET NULL,
  priority INT NOT NULL DEFAULT 0 CHECK (priority BETWEEN -100 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_template_is_active ON faq_template(is_active);
CREATE INDEX idx_template_category_id ON faq_template(category_id);
CREATE INDEX idx_template_priority ON faq_template(priority);
CREATE INDEX idx_template_deleted_at ON faq_template(deleted_at);

-- 3. 중복 방지용 UNIQUE 인덱스 (대소문자 무시)
CREATE UNIQUE INDEX idx_template_question_unique ON faq_template(LOWER(question)) WHERE deleted_at IS NULL;

-- 4. 초기 샘플 데이터 (선택)
INSERT INTO faq_template (question, answer, keywords, category_id, priority)
SELECT
  '배송 기간이 얼마나 걸리나요?',
  '일반 배송은 영업일 기준 2-3일 소요됩니다. 빠른 배송을 원하시면 주문 시 특급 배송을 선택해주세요.',
  ARRAY['배송', '기간', '소요'],
  (SELECT id FROM category WHERE slug = 'shipping' LIMIT 1),
  10
WHERE EXISTS (SELECT 1 FROM category WHERE slug = 'shipping');
```

---

## 5. API 설계

### 5.1 POST /api/templates — 템플릿 생성

**목적**: 관리자가 새 FAQ 템플릿을 등록합니다.

**인증**: 필요 (JWT + admin 역할 검증)

**Request Body**:
```json
{
  "question": "배송 기간이 얼마나 걸리나요?",
  "answer": "일반 배송은 영업일 기준 2-3일 소요됩니다.",
  "keywords": ["배송", "기간", "소요"],
  "categoryId": "uuid-1234", // 선택, null이면 전체 카테고리
  "priority": 10, // 선택, 기본값 0
  "isActive": true // 선택, 기본값 true
}
```

**검증 규칙**:
- question: 10~500자, 중복 불가 (대소문자 무시)
- answer: 10~2000자
- keywords: 배열, 최대 20개, 각 키워드 2~50자
- priority: -100 ~ 100 범위
- categoryId: 유효한 category.id이거나 null

**Response (201 Created)**:
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
    "createdAt": "2026-02-12T12:00:00.000Z"
  }
}
```

**에러 케이스**:
| 코드 | 상황 | 응답 |
|------|------|------|
| 400 | 검증 실패 (글자 수, 타입) | `{ "success": false, "error": "question은 10자 이상 500자 이하여야 합니다" }` |
| 400 | keywords 개수 초과 | `{ "success": false, "error": "keywords는 최대 20개까지 가능합니다" }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |
| 404 | categoryId 없음 | `{ "success": false, "error": "카테고리를 찾을 수 없습니다" }` |
| 409 | 중복 질문 | `{ "success": false, "error": "이미 등록된 질문입니다" }` |

---

### 5.2 GET /api/templates — 템플릿 조회

**목적**: 관리자가 템플릿 목록을 조회합니다.

**인증**: 필요 (JWT + admin 역할 검증)

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| categoryId | string (UUID) | No | 카테고리별 필터 |
| isActive | boolean | No | 활성화 상태 필터 (true/false) |
| search | string | No | 질문/답변 내용 검색 (부분 일치) |
| page | number | No | 페이지 번호 (기본값: 1) |
| limit | number | No | 페이지 크기 (기본값: 20, 최대: 100) |

**Response (200 OK)**:
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
        "createdAt": "2026-01-01T12:00:00.000Z"
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

**정렬 규칙**:
1. priority (내림차순)
2. createdAt (최신순)

**에러 케이스**:
| 코드 | 상황 | 응답 |
|------|------|------|
| 400 | 잘못된 파라미터 | `{ "success": false, "error": "limit은 1~100 사이여야 합니다" }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |

---

### 5.3 PUT /api/templates/:id — 템플릿 수정

**목적**: 관리자가 기존 템플릿을 수정합니다.

**인증**: 필요 (JWT + admin 역할 검증)

**Request Body**:
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

**검증 규칙**: POST와 동일

**Response (200 OK)**:
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
    "updatedAt": "2026-02-12T12:30:00.000Z"
  }
}
```

**에러 케이스**:
| 코드 | 상황 | 응답 |
|------|------|------|
| 400 | 검증 실패 | `{ "success": false, "error": "..." }` |
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |
| 404 | 템플릿 없음 | `{ "success": false, "error": "템플릿을 찾을 수 없습니다" }` |
| 409 | 중복 질문 (다른 템플릿과) | `{ "success": false, "error": "이미 등록된 질문입니다" }` |

---

### 5.4 DELETE /api/templates/:id — 템플릿 삭제

**목적**: 관리자가 템플릿을 삭제합니다 (Soft Delete).

**인증**: 필요 (JWT + admin 역할 검증)

**Response (204 No Content)**:
(본문 없음)

**에러 케이스**:
| 코드 | 상황 | 응답 |
|------|------|------|
| 403 | 관리자 아님 | `{ "success": false, "error": "관리자 권한이 필요합니다" }` |
| 404 | 템플릿 없음 또는 이미 삭제됨 | `{ "success": false, "error": "템플릿을 찾을 수 없습니다" }` |

**구현 세부사항**:
```typescript
// Soft Delete
await prisma.faqTemplate.update({
  where: { id, deletedAt: null },
  data: { deletedAt: new Date() }
});
```

---

## 6. 템플릿 매칭 알고리즘 상세

### 6.1 매칭 프로세스

```typescript
async function matchTemplate(
  userMessage: string,
  categoryId?: string | null
): Promise<MatchedTemplate | null> {
  // 1. 메시지 정규화
  const normalizedMessage = userMessage.toLowerCase().trim();

  // 2. 활성 템플릿 조회 (캐시 활용)
  const activeTemplates = await getActiveTemplates();

  // 3. 매칭 점수 계산
  const candidates = activeTemplates.map(template => {
    // 3-1. 키워드 매칭 검사
    const matchedKeywords = template.keywords.filter(keyword =>
      normalizedMessage.includes(keyword.toLowerCase())
    );

    // 모든 키워드가 포함되지 않으면 점수 0
    if (matchedKeywords.length !== template.keywords.length) {
      return { template, score: 0 };
    }

    // 3-2. 점수 계산
    let score = matchedKeywords.length * 10; // 키워드 개수 × 10
    score += template.priority; // 우선순위 추가

    // 카테고리 일치 시 보너스
    if (categoryId && template.categoryId === categoryId) {
      score += 5;
    }

    return { template, score };
  });

  // 4. 점수 필터링 (임계값 10점 이상)
  const validCandidates = candidates.filter(c => c.score >= 10);

  if (validCandidates.length === 0) {
    return null; // 매칭 실패
  }

  // 5. 최고 점수 선택 (동점이면 최신 템플릿)
  validCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.template.createdAt.getTime() - a.template.createdAt.getTime();
  });

  const winner = validCandidates[0];

  // 6. 사용 통계 업데이트 (비동기, 실패해도 무시)
  updateUsageStats(winner.template.id).catch(err =>
    logger.warn('템플릿 사용 통계 업데이트 실패:', err)
  );

  return {
    templateId: winner.template.id,
    answer: winner.template.answer,
    matchScore: winner.score,
  };
}
```

### 6.2 점수 계산 예시

**템플릿 A**:
- question: "배송 기간이 얼마나 걸리나요?"
- keywords: ["배송", "기간"]
- priority: 10
- categoryId: "shipping-uuid"

**템플릿 B**:
- question: "반품은 어떻게 하나요?"
- keywords: ["반품"]
- priority: 5
- categoryId: "return-uuid"

**사용자 메시지**: "배송 기간이 궁금합니다"
**대화 카테고리**: "shipping-uuid"

**매칭 결과**:
- 템플릿 A: (2개 키워드 매칭 × 10) + 10 + 5 = **35점** ✅
- 템플릿 B: 키워드 미매칭 = **0점**

**선택**: 템플릿 A의 답변 반환

### 6.3 성능 최적화

- **캐시 활용**: 활성 템플릿을 메모리에 5분간 캐싱 (DB I/O 제거)
- **조기 종료**: 키워드가 하나라도 누락되면 즉시 점수 0 처리
- **인덱스 활용**: `isActive` 인덱스로 활성 템플릿만 조회
- **목표 달성**: 템플릿 100개 기준 10~20ms, 1,000개 기준 30~50ms

---

## 7. F-03 통합 방안

### 7.1 chat.service.ts 수정 범위

**기존 코드 (F-03)**:
```typescript
// backend/src/services/chat.service.ts

async processMessage(request: ChatRequest): Promise<ChatResponse> {
  // 1. 입력 검증
  // 2. Conversation 확인/생성
  // 3. 사용자 메시지 저장
  // 4. 대화 이력 조회

  // 5. OpenAI API 호출 (답변 생성) ← 여기에 템플릿 매칭 추가
  const result = await generateAnswer(conversationHistory, message, categoryName);

  // 6. 답변 메시지 저장
  // 7. Conversation 업데이트
  // 8. 결과 반환
}
```

**수정 후 코드 (F-07 통합)**:
```typescript
// backend/src/services/chat.service.ts

import { TemplateService } from './template.service'; // F-07 추가

export class ChatService {
  private templateService = new TemplateService();

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    // 1~4. 기존 로직 (변경 없음)

    // 5. 템플릿 매칭 시도 (F-07 신규)
    const startTime = Date.now();
    const matchedTemplate = await this.templateService.matchTemplate(
      message,
      conversation.categoryId
    );
    const matchTimeMs = Date.now() - startTime;

    let assistantContent: string;
    let metadata: any;
    let needsEscalation = false;

    if (matchedTemplate) {
      // 템플릿 매칭 성공 → AI 호출 생략
      assistantContent = matchedTemplate.answer;
      metadata = {
        source: 'template',
        templateId: matchedTemplate.templateId,
        matchScore: matchedTemplate.matchScore,
        matchTimeMs,
      };
      needsEscalation = false;
    } else {
      // 템플릿 매칭 실패 → 기존 OpenAI API 호출 (폴백)
      try {
        const result = await generateAnswer(
          conversationHistory,
          message,
          conversation.category?.name
        );
        assistantContent = result.content;
        needsEscalation = result.needsEscalation;
        metadata = {
          source: 'openai',
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          responseTimeMs: Date.now() - startTime,
          fallbackReason: '템플릿 매칭 실패',
        };
      } catch (error) {
        // AI 폴백 실패 시 시스템 메시지
        assistantContent = '죄송합니다. 일시적인 오류가 발생했습니다...';
        needsEscalation = true;
        metadata = {
          source: 'system',
          error: error.message,
        };
      }
    }

    // 6. 답변 메시지 저장 (metadata 포함)
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.assistant,
        content: assistantContent,
        metadata, // F-07 추가
      },
    });

    // 7~8. 기존 로직 (변경 없음)
  }
}
```

**변경 요약**:
- TemplateService import 추가
- processMessage() 내부에 템플릿 매칭 로직 삽입 (4단계 이후)
- 템플릿 매칭 성공 시 generateAnswer() 호출 생략
- 템플릿 매칭 실패 시 기존 OpenAI API 로직 실행 (폴백)
- message.metadata에 매칭 정보 기록

**최소 수정 원칙 준수**:
- 기존 입력/출력 인터페이스 변경 없음
- 에러 처리 로직 유지
- 에스컬레이션 판단 로직 유지

---

## 8. 시퀀스 다이어그램

### 8.1 템플릿 매칭 성공 시나리오

```
사용자 → Frontend → ChatController → ChatService → TemplateService → DB
  │                      │                │               │
  │  POST /api/chat      │                │               │
  │─────────────────────▶│                │               │
  │                      │ processMessage()│               │
  │                      │───────────────▶│               │
  │                      │                │ matchTemplate()│
  │                      │                │──────────────▶│
  │                      │                │               │ SELECT * FROM faq_template
  │                      │                │               │ WHERE isActive=true (캐시)
  │                      │                │◀──────────────│
  │                      │                │ 점수 계산      │
  │                      │                │ (35점)        │
  │                      │◀───────────────│               │
  │                      │ templateId, answer              │
  │                      │                │               │
  │                      │ INSERT message (metadata: template)
  │                      │────────────────────────────────▶│
  │                      │◀────────────────────────────────│
  │                      │                │               │
  │  { success: true,    │                │               │
  │    assistantMessage  │                │               │
  │    (템플릿 답변) }    │                │               │
  │◀─────────────────────│                │               │
  │                      │                │               │
  │  (AI 호출 없음, 1초 이내 응답)          │               │
```

### 8.2 템플릿 매칭 실패 → AI 폴백 시나리오

```
사용자 → Frontend → ChatController → ChatService → TemplateService → OpenAI API
  │                      │                │               │
  │  POST /api/chat      │                │               │
  │─────────────────────▶│                │               │
  │                      │ processMessage()│               │
  │                      │───────────────▶│               │
  │                      │                │ matchTemplate()│
  │                      │                │──────────────▶│
  │                      │                │ 매칭 실패 (null)
  │                      │◀───────────────│               │
  │                      │                │               │
  │                      │ generateAnswer()               │
  │                      │───────────────────────────────▶│
  │                      │                                │ OpenAI API
  │                      │◀───────────────────────────────│
  │                      │ AI 답변 (2~5초)                │
  │                      │                                │
  │                      │ INSERT message (metadata: openai)
  │                      │────────────────────────────────▶DB
  │                      │◀────────────────────────────────│
  │                      │                                │
  │  { success: true,    │                                │
  │    assistantMessage  │                                │
  │    (AI 답변) }        │                                │
  │◀─────────────────────│                                │
```

### 8.3 관리자 템플릿 생성 시나리오

```
관리자 → Frontend → TemplateController → TemplateService → DB
  │                      │                    │
  │ POST /api/templates  │                    │
  │─────────────────────▶│                    │
  │                      │ createTemplate()   │
  │                      │───────────────────▶│
  │                      │                    │ 검증: question 중복 체크
  │                      │                    │──────────▶│
  │                      │                    │◀──────────│
  │                      │                    │ 검증: categoryId 유효성
  │                      │                    │──────────▶│
  │                      │                    │◀──────────│
  │                      │                    │ INSERT faq_template
  │                      │                    │──────────▶│
  │                      │                    │◀──────────│
  │                      │                    │ 캐시 무효화
  │                      │◀───────────────────│
  │                      │                    │
  │  { success: true,    │                    │
  │    data: {...} }     │                    │
  │◀─────────────────────│                    │
```

---

## 9. 영향 범위 분석

### 9.1 수정 필요한 기존 파일

| 파일 경로 | 변경 내용 | 이유 |
|----------|----------|------|
| backend/prisma/schema.prisma | FaqTemplate 모델 추가, Category 관계 추가 | 새 테이블 정의 |
| backend/src/services/chat.service.ts | processMessage() 함수 수정 (템플릿 매칭 추가) | F-03 통합 |
| backend/src/services/chat.service.ts | TemplateService import 추가 | 의존성 주입 |
| backend/src/services/chat.service.ts | message.metadata 기록 로직 추가 | 템플릿 매칭 로깅 |

### 9.2 새로 생성할 파일

| 파일 경로 | 역할 |
|----------|------|
| backend/src/services/template.service.ts | 템플릿 CRUD + 매칭 로직 (핵심 비즈니스 로직) |
| backend/src/routes/template.routes.ts | 템플릿 API 라우트 정의 (POST/GET/PUT/DELETE) |
| backend/src/controllers/template.controller.ts | 템플릿 API 요청/응답 처리 |
| backend/src/validators/template.validator.ts | 템플릿 입력 검증 (Zod 스키마) |
| backend/src/types/template.types.ts | 템플릿 관련 타입 정의 |
| backend/src/middleware/admin.middleware.ts | 관리자 권한 검증 미들웨어 (F-01 활용) |
| backend/src/__tests__/services/template.service.test.ts | 템플릿 서비스 유닛 테스트 |
| backend/src/__tests__/routes/template.routes.test.ts | 템플릿 API 통합 테스트 |
| frontend/src/app/admin/templates/page.tsx | 템플릿 목록 페이지 (관리자 전용) |
| frontend/src/app/admin/templates/new/page.tsx | 템플릿 생성 페이지 |
| frontend/src/app/admin/templates/[id]/edit/page.tsx | 템플릿 수정 페이지 |
| frontend/src/components/admin/TemplateForm.tsx | 템플릿 생성/수정 폼 컴포넌트 |
| frontend/src/components/admin/TemplateList.tsx | 템플릿 목록 테이블 컴포넌트 |
| frontend/src/lib/api/templates.ts | 템플릿 API 클라이언트 함수 |

### 9.3 영향 받는 기존 기능

| 기능명 | 영향 내용 | 대응 방안 |
|-------|----------|----------|
| F-03 (AI 기반 자동 답변) | chat.service.ts에 템플릿 매칭 로직 추가 | 기존 AI 로직은 폴백으로 유지 (호환성 보장) |
| F-02 (문의 자동 분류) | category 테이블에 faqTemplates 관계 추가 | 기존 기능에 영향 없음 (읽기 전용 관계) |
| F-04 (대화 이력) | message.metadata에 템플릿 정보 추가 | 기존 메타데이터와 병합 (선택적 필드) |
| F-01 (사용자 인증) | 관리자 권한 검증 로직 재사용 | admin.middleware.ts에서 기존 JWT 미들웨어 활용 |

---

## 10. 보안 고려사항

### 10.1 XSS 방지

**문제**: 템플릿 answer 필드에 악의적인 스크립트가 포함될 경우 프론트엔드에서 실행될 위험

**대응**:
- 백엔드: 템플릿 저장 시 입력값 sanitize (HTML 특수문자 이스케이프)
  ```typescript
  import DOMPurify from 'isomorphic-dompurify';

  function sanitizeTemplate(template: CreateTemplateDto) {
    return {
      ...template,
      question: DOMPurify.sanitize(template.question, { ALLOWED_TAGS: [] }),
      answer: DOMPurify.sanitize(template.answer, { ALLOWED_TAGS: [] }),
    };
  }
  ```
- 프론트엔드: React의 기본 XSS 보호 (dangerouslySetInnerHTML 사용 금지)

### 10.2 관리자 권한 검증

**문제**: 비관리자가 템플릿 CRUD API에 접근하면 데이터 조작 가능

**대응**:
```typescript
// backend/src/middleware/admin.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user; // JWT 미들웨어에서 설정

  if (!user) {
    throw new AppError(401, '인증이 필요합니다');
  }

  if (user.role !== 'admin') {
    throw new AppError(403, '관리자 권한이 필요합니다');
  }

  next();
}

// 라우트 적용
router.post('/templates', requireAuth, requireAdmin, createTemplate);
```

### 10.3 Rate Limiting

**문제**: 템플릿 CRUD API 남용으로 서버 부하 발생

**대응**:
```typescript
import rateLimit from 'express-rate-limit';

const templateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // 관리자당 분당 30회
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
});

router.use('/templates', requireAuth, requireAdmin, templateRateLimiter);
```

### 10.4 SQL Injection 방지

**문제**: keywords 배열이 PostgreSQL 배열로 저장되므로 SQL Injection 위험

**대응**:
- Prisma ORM 사용 (파라미터화된 쿼리 자동 생성)
- 직접 SQL 쿼리 금지
- keywords 배열은 Prisma가 자동으로 안전하게 처리

---

## 11. 기술적 주의사항

### 11.1 캐시 무효화 전략

- 템플릿 생성/수정/삭제 시 메모리 캐시 즉시 무효화
  ```typescript
  function invalidateTemplateCache() {
    cachedTemplates = null;
    cacheExpiry = 0;
  }

  // 예: 템플릿 생성 후
  await prisma.faqTemplate.create({ ... });
  invalidateTemplateCache();
  ```
- 다중 서버 환경에서는 Redis Pub/Sub으로 캐시 무효화 이벤트 브로드캐스트 필요 (향후 개선)

### 11.2 대소문자 구분 없는 중복 방지

- PostgreSQL UNIQUE 인덱스에서 LOWER() 함수 사용
  ```sql
  CREATE UNIQUE INDEX idx_template_question_unique
  ON faq_template(LOWER(question))
  WHERE deleted_at IS NULL;
  ```
- 템플릿 생성 시 Prisma에서 중복 체크
  ```typescript
  const existing = await prisma.faqTemplate.findFirst({
    where: {
      question: { equals: question, mode: 'insensitive' },
      deletedAt: null,
    },
  });
  if (existing) {
    throw new AppError(409, '이미 등록된 질문입니다');
  }
  ```

### 11.3 성능 모니터링

- 템플릿 매칭 시간 로깅 (50ms 목표)
  ```typescript
  const startTime = Date.now();
  const matched = await matchTemplate(message, categoryId);
  const matchTimeMs = Date.now() - startTime;

  if (matchTimeMs > 50) {
    logger.warn(`템플릿 매칭 성능 저하: ${matchTimeMs}ms`);
  }
  ```
- 메트릭 수집: 평균 매칭 시간, 매칭 성공률, 캐시 히트율

### 11.4 동시성 제어

**문제**: 동일한 템플릿을 여러 관리자가 동시에 수정하면 데이터 손실 가능

**대응**:
- 옵티미스틱 락 (Optimistic Locking)
  ```prisma
  model FaqTemplate {
    // ... 기존 필드
    version Int @default(0) // 버전 필드 추가
  }
  ```
  ```typescript
  // 템플릿 수정 시 버전 확인
  await prisma.faqTemplate.update({
    where: { id, version: currentVersion },
    data: { ...updates, version: currentVersion + 1 },
  });
  // 버전 불일치 시 409 Conflict 반환
  ```

### 11.5 Soft Delete 주의사항

- 조회 시 항상 deletedAt IS NULL 조건 추가
  ```typescript
  const templates = await prisma.faqTemplate.findMany({
    where: { deletedAt: null, isActive: true },
  });
  ```
- UNIQUE 인덱스에 WHERE deletedAt IS NULL 조건 포함 (삭제된 질문 재등록 허용)

---

## 12. 테스트 전략

### 12.1 유닛 테스트 (TemplateService)

**테스트 케이스**:
- matchTemplate(): 키워드 매칭 성공/실패
- matchTemplate(): 점수 계산 정확성 (키워드 개수, priority, 카테고리 보너스)
- matchTemplate(): 동점 시 최신 템플릿 선택
- matchTemplate(): 캐시 히트/미스 시나리오
- createTemplate(): 중복 질문 검증 (대소문자 무시)
- createTemplate(): keywords 개수 제한 (최대 20개)
- createTemplate(): priority 범위 검증 (-100 ~ 100)

### 12.2 통합 테스트 (API)

**테스트 케이스**:
- POST /api/templates: 관리자 권한 검증
- POST /api/templates: 중복 질문 409 에러
- GET /api/templates: 페이지네이션 동작 확인
- GET /api/templates: 카테고리 필터링 확인
- PUT /api/templates/:id: 템플릿 수정 후 캐시 무효화
- DELETE /api/templates/:id: Soft Delete 확인

### 12.3 E2E 테스트 (ChatService 통합)

**시나리오**:
1. 템플릿 등록 → 사용자 메시지 전송 → 템플릿 답변 반환 확인
2. 템플릿 미매칭 → AI 폴백 확인
3. 템플릿 비활성화 → AI 폴백 확인
4. message.metadata에 템플릿 정보 기록 확인

---

## 13. 향후 확장 계획

### 13.1 NLP 기반 매칭 (Phase 2)

- 키워드 기반에서 의미론적 유사도 기반으로 전환
- 한국어 형태소 분석 라이브러리 도입 (mecab-ko, komoran)
- 임베딩 모델 (OpenAI Embeddings, Sentence-BERT) 활용
- 유사도 점수 임계값 (예: 0.8 이상) 기반 매칭

### 13.2 템플릿 통계 대시보드 (F-08 통합)

- 템플릿별 사용 횟수 시각화
- 미매칭 질문 TOP 10 수집
- 템플릿 커버리지 (전체 메시지 중 템플릿 매칭 비율)

### 13.3 다국어 지원 (F-10 통합)

- FaqTemplate 테이블에 language 필드 추가
- 사용자 언어 설정에 따라 매칭 언어 필터링

---

## 14. 변경 이력

| 날짜 | 변경 내용 | 이유 |
|------|-----------|------|
| 2026-02-12 | 초안 작성 | requirements.md 기반 설계 |
