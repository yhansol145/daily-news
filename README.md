# daily-news

매일 뉴스를 수집하여 카드뉴스 형태로 만들고, 설정된 시간에 카카오톡으로 알림을 보내주는 서비스입니다.

## 기술 스택

- **Framework**: NestJS (TypeScript)
- **Architecture**: Clean Architecture (Presentation → Application → Domain → Infrastructure)
- **Notification**: KakaoTalk API
- **Scheduler**: @nestjs/schedule (Cron)

## 프로젝트 구조

```
src/
├── main.ts
├── app.module.ts
└── modules/
    ├── news/                  # 뉴스 수집 모듈
    │   ├── domain/            # 엔티티, 포트(인터페이스)
    │   ├── application/       # 유스케이스, 서비스
    │   ├── infrastructure/    # 외부 뉴스 API 어댑터
    │   └── presentation/      # HTTP 컨트롤러
    ├── card-news/             # 카드뉴스 생성 모듈
    │   ├── domain/
    │   ├── application/
    │   └── presentation/
    ├── notification/          # 카카오톡 알림 모듈
    │   ├── domain/
    │   ├── application/
    │   └── infrastructure/    # 카카오 API 어댑터
    └── scheduler/             # 스케줄러 모듈 (매일 오전 8시)
```

## 아키텍처

Clean Architecture를 기반으로 각 모듈은 4개의 레이어로 구성됩니다.

```
Controller → Service → UseCase → Port(Interface) ← Adapter(구현체)
```

- **Presentation**: HTTP 요청/응답 처리
- **Application**: 비즈니스 로직 오케스트레이션 (UseCase, Service)
- **Domain**: 핵심 엔티티 및 외부 의존성 인터페이스(Port) 정의
- **Infrastructure**: 외부 API 연동 구현체 (Adapter)

## 시작하기

### 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 설정합니다.

| 변수명 | 설명 |
|--------|------|
| `PORT` | 서버 포트 (기본값: 3000) |
| `NEWS_API_KEY` | 뉴스 API 키 |
| `NEWS_API_URL` | 뉴스 API URL |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 |
| `KAKAO_REFRESH_TOKEN` | 카카오 리프레시 토큰 |
| `NOTIFICATION_CRON` | 알림 발송 cron 표현식 (기본값: `0 8 * * *`, 매일 오전 8시) |

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/news` | 오늘의 뉴스 목록 조회 |
| GET | `/news?category=tech` | 카테고리별 뉴스 조회 |
| GET | `/card-news` | 오늘의 카드뉴스 목록 조회 |
