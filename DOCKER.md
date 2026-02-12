# Docker 배포 가이드

## 사전 요구사항

- Docker Engine 20.10 이상
- Docker Compose 2.0 이상

## 빠른 시작

### 1. 환경변수 설정

루트 디렉토리에 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일을 열어 필수 값 입력:

```env
JWT_SECRET=your-secure-random-32-character-string
OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. 컨테이너 실행

```bash
# 백그라운드에서 모든 서비스 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 확인
docker-compose logs -f backend
```

### 3. 서비스 접속

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:4000
- **PostgreSQL**: localhost:5432

### 4. 초기 데이터베이스 마이그레이션

첫 실행 시 자동으로 마이그레이션이 실행됩니다. 수동으로 실행하려면:

```bash
docker-compose exec backend npx prisma migrate deploy
```

## 개발 모드

개발 중에는 로컬에서 실행하고 PostgreSQL만 Docker로 사용:

```bash
# PostgreSQL만 실행
docker-compose up -d postgres

# 백엔드 로컬 실행
cd backend
npm run dev

# 프론트엔드 로컬 실행 (새 터미널)
cd frontend
npm run dev
```

## 유용한 명령어

### 컨테이너 관리

```bash
# 모든 서비스 중지
docker-compose stop

# 모든 서비스 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart backend

# 모든 컨테이너 삭제 (데이터는 유지)
docker-compose down

# 컨테이너 + 볼륨 모두 삭제 (⚠️ 데이터 손실)
docker-compose down -v
```

### 빌드

```bash
# 이미지 다시 빌드
docker-compose build

# 캐시 없이 빌드
docker-compose build --no-cache

# 특정 서비스만 빌드
docker-compose build backend
```

### 로그 및 디버깅

```bash
# 실시간 로그 (모든 서비스)
docker-compose logs -f

# 최근 100줄만 보기
docker-compose logs --tail=100

# 컨테이너 내부 접속
docker-compose exec backend sh
docker-compose exec postgres psql -U chatbot -d chatbot
```

### 데이터베이스 관리

```bash
# Prisma Studio 실행
docker-compose exec backend npx prisma studio

# 마이그레이션 생성
docker-compose exec backend npx prisma migrate dev --name migration_name

# DB 백업
docker-compose exec postgres pg_dump -U chatbot chatbot > backup.sql

# DB 복원
docker-compose exec -T postgres psql -U chatbot chatbot < backup.sql
```

## 프로덕션 배포

### 1. 환경변수 보안 강화

```env
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
```

### 2. docker-compose.prod.yml 사용

프로덕션 전용 설정:

```yaml
version: '3.8'

services:
  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # 환경변수로 관리

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      NODE_ENV: production

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
```

실행:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. HTTPS 설정 (Nginx + Let's Encrypt)

별도 리버스 프록시 권장:

```bash
# nginx-proxy + letsencrypt 사용 예시
docker-compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

## 트러블슈팅

### 포트 충돌

포트가 이미 사용 중인 경우 docker-compose.yml 수정:

```yaml
services:
  backend:
    ports:
      - "5000:4000"  # 호스트:컨테이너
```

### 마이그레이션 실패

```bash
# Prisma Client 재생성
docker-compose exec backend npx prisma generate

# 마이그레이션 상태 확인
docker-compose exec backend npx prisma migrate status

# 강제 리셋 (⚠️ 데이터 손실)
docker-compose exec backend npx prisma migrate reset
```

### 컨테이너가 계속 재시작

로그 확인:

```bash
docker-compose logs backend
docker-compose logs postgres
```

### 메모리 부족

Docker Desktop 설정에서 메모리 할당 증가 (최소 4GB 권장)

## 성능 최적화

### 1. 멀티 스테이지 빌드 (이미 적용됨)

Dockerfile에서 빌드 스테이지와 프로덕션 스테이지 분리

### 2. 볼륨 캐싱

개발 시 node_modules 캐싱으로 속도 향상:

```yaml
volumes:
  - ./backend:/app
  - /app/node_modules  # 컨테이너 내부 node_modules 사용
```

### 3. 빌드 캐시 활용

```bash
docker-compose build --parallel
```

## 모니터링

### Health Check 상태 확인

```bash
docker-compose ps
```

출력 예시:
```
NAME                COMMAND             STATUS              PORTS
chatbot-backend     "npm start"         Up (healthy)        0.0.0.0:4000->4000/tcp
chatbot-frontend    "npm start"         Up (healthy)        0.0.0.0:3000->3000/tcp
chatbot-postgres    "postgres"          Up (healthy)        0.0.0.0:5432->5432/tcp
```

## 참고 자료

- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [Prisma Docker 가이드](https://www.prisma.io/docs/guides/deployment/deploy-to-docker)
- [Next.js Docker 가이드](https://nextjs.org/docs/deployment#docker-image)
