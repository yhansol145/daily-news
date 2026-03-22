# CLAUDE.md

## 프로젝트 개요

매일 뉴스를 수집하여 카드뉴스 형태로 변환 후, 설정된 시간에 카카오톡으로 알림을 보내는 NestJS 서비스.

## 아키텍처 원칙

Clean Architecture를 따른다. 각 모듈은 아래 4개 레이어로 구성된다.

```
Presentation → Application → Domain ← Infrastructure
(Controller)   (Service,      (Entity,    (Adapter)
               UseCase)        Port)
```

- **Domain**은 외부에 의존하지 않는다. 외부 의존성은 Port(인터페이스)로만 정의한다.
- **Infrastructure**는 Domain의 Port를 구현한다. (`implements XxxPort`)
- **Application**은 UseCase와 Service로 구성된다. UseCase는 단일 책임, Service는 UseCase를 조합한다.
- **Presentation**은 HTTP 요청을 받아 Service를 호출하고 응답을 반환한다.
- 모듈 간 의존성은 `exports`된 Service를 통해서만 허용한다. 다른 모듈의 내부 클래스를 직접 import하지 않는다.

## 모듈 구성

| 모듈 | 역할 |
|------|------|
| `news` | 외부 뉴스 API에서 뉴스 수집 |
| `card-news` | 수집된 뉴스를 카드뉴스 형태로 변환 |
| `notification` | 카드뉴스를 카카오톡으로 발송 |
| `scheduler` | 매일 지정 시각에 전체 파이프라인 실행 |

## 코드 컨벤션

- 파일명: `kebab-case` (예: `fetch-daily-news.use-case.ts`)
- 클래스명: `PascalCase` (예: `FetchDailyNewsUseCase`)
- Port 심볼은 같은 파일에 `export const XXX_PORT = Symbol('XXX_PORT')` 형태로 정의한다.
- 미구현 메서드는 `throw new Error('Not implemented')`로 표시한다.

## 환경 변수

`.env.example` 참고. 실제 `.env`는 git에 커밋하지 않는다.

## 실행

```bash
npm run start:dev   # 개발
npm run build       # 빌드
npm run start:prod  # 프로덕션
```
