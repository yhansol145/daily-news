# daily-news

매일 뉴스를 수집하여 카드뉴스 형태로 만들고, 설정된 시간에 카카오톡으로 알림을 보내주는 서비스입니다.

## 기술 스택

- **Framework**: NestJS (TypeScript)
- **Architecture**: Clean Architecture (Presentation → Application → Domain ← Infrastructure)
- **News**: 네이버 뉴스 검색 API
- **Text**: Groq (`llama-3.3-70b-versatile`)
- **Image**: HuggingFace Inference Providers (`FLUX.1-schnell`) 또는 Pollinations
- **Notification**: 카카오톡 나에게 보내기(메모) API
- **Scheduler**: @nestjs/schedule (Cron)

## 동작 흐름

```
매일 08:00 (Asia/Seoul)
  └─ 뉴스 수집 (카테고리별 N건)
       └─ 카드뉴스 생성 (문구 by Groq + 이미지 by Pollinations/HuggingFace)
            └─ 일자별 JSON 저장 (data/card-news/YYYY-MM-DD.json)
                 └─ 카카오톡 발송 (카드뉴스 1건당 feed 템플릿 1건)
```

메시지는 카카오톡 **'나와의 채팅'** 방으로 도착합니다.

카테고리는 `경제`, `사회`, `생활문화` 3종입니다. ([news-category.ts](src/modules/news/domain/news-category.ts))

## 프로젝트 구조

```
src/
├── main.ts
├── app.module.ts
├── common/                    # 공통 유틸 (재시도, 날짜, BASE_URL 해석)
└── modules/
    ├── news/                  # 뉴스 수집
    │   ├── domain/            # NewsEntity, NewsFetcherPort
    │   ├── application/       # FetchDailyNewsUseCase, NewsService
    │   ├── infrastructure/    # NewsFetcherAdapter (네이버)
    │   └── presentation/      # NewsController
    ├── card-news/             # 카드뉴스 생성
    │   ├── domain/            # CardNewsEntity, LlmPort, ImageGeneratorPort, CardNewsRepositoryPort
    │   ├── application/       # Create/Generate/GetDaily UseCase, CardNewsService
    │   ├── infrastructure/    # GroqAdapter, HuggingFace/Pollinations Adapter,
    │   │                      # ImageStorage, FileCardNewsRepository
    │   └── presentation/      # CardNewsController
    ├── notification/          # 카카오톡 알림
    │   ├── domain/            # NotificationPort
    │   ├── application/       # SendNotificationUseCase, NotificationService
    │   └── infrastructure/    # KakaoNotificationAdapter, KakaoTokenProvider
    └── scheduler/             # 매일 지정 시각 파이프라인 실행
        └── presentation/      # SchedulerController (수동 실행)
```

## 아키텍처

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

| 변수명 | 필수 | 기본값 | 설명 |
|--------|------|--------|------|
| `PORT` | | `3000` | 서버 포트 |
| `NODE_ENV` | | `development` | 실행 환경 |
| `BASE_URL` | huggingface 사용 시 | `http://localhost:{PORT}` | 외부 공개 주소. 이미지를 직접 호스팅할 때만 필요 |
| `NAVER_CLIENT_ID` | ✅ | | 네이버 뉴스 검색 API |
| `NAVER_CLIENT_SECRET` | ✅ | | 네이버 뉴스 검색 API |
| `NEWS_PER_CATEGORY` | | `3` | 카테고리당 수집 건수 |
| `GROQ_API_KEY` | ✅ | | 카드뉴스 문구 생성 |
| `GROQ_MODEL` | | `llama-3.3-70b-versatile` | Groq 모델명 |
| `IMAGE_PROVIDER` | | `huggingface` | 이미지 제공자 (`pollinations` \| `huggingface`) |
| `HF_TOKEN` | huggingface 사용 시 | | HuggingFace 토큰 |
| `HF_IMAGE_PROVIDER` | | `nscale` | HF Inference Provider (`nscale`, `together`, `wavespeed`) |
| `HF_IMAGE_MODEL` | | `black-forest-labs/FLUX.1-schnell` | 이미지 모델 |
| `POLLINATIONS_IMAGE_SIZE` | | `1024` | pollinations 이미지 한 변 크기 |
| `POLLINATIONS_DIRECT_URL` | | `true` | pollinations 공개 URL 을 그대로 사용 (false 면 내려받아 호스팅) |
| `CARD_NEWS_CONCURRENCY` | | `3` | 카드뉴스 생성 동시 실행 수 (pollinations 사용 시 `1` 권장) |
| `IMAGE_RETENTION_DAYS` | | `7` | 생성 이미지 보관 일수 |
| `KAKAO_REST_API_KEY` | ✅ | | 카카오 REST API 키 |
| `KAKAO_CLIENT_SECRET` | | | 카카오 보안 설정에서 활성화한 경우만 |
| `KAKAO_REFRESH_TOKEN` | ✅ | | 아래 '카카오 토큰 발급' 참고 |
| `KAKAO_SEND_INTERVAL_MS` | | `300` | 연속 발송 간격 |
| `NOTIFICATION_CRON` | | `0 8 * * *` | 발송 시각 |
| `SCHEDULER_TIMEZONE` | | `Asia/Seoul` | cron 타임존 |
| `SCHEDULER_TRIGGER_TOKEN` | 운영 시 | | 수동 실행 API 보호용 토큰 |

### 설치 및 실행

```bash
npm install
npm run start:dev    # 개발
npm run build        # 빌드
npm run start:prod   # 프로덕션
npm test             # 테스트
```

## 카카오 토큰 발급

`KAKAO_REFRESH_TOKEN` 은 OAuth 동의 절차를 한 번 거쳐야 얻을 수 있습니다.
발급 이후의 access token 갱신은 [KakaoTokenProvider](src/modules/notification/infrastructure/kakao-token.provider.ts) 가 자동으로 처리합니다.

[카카오 개발자 콘솔](https://developers.kakao.com)에서 앱을 만든 뒤 아래 순서로 진행합니다.

> 콘솔 개편으로 메뉴 위치가 문서마다 다릅니다. 아래는 2026-08 기준 실제 경로입니다.

1. **앱 → 플랫폼 키** — `REST API 키` 복사 → `KAKAO_REST_API_KEY`
2. **앱 → 플랫폼 키 → REST API 키 → 카카오 로그인 리다이렉트 URI**
   에 `http://localhost:3000/oauth/kakao` 등록
   *(카카오 로그인 메뉴가 아니라 여기입니다. `카카오 로그인 → 고급` 의 '로그아웃 리다이렉트 URI' 와 혼동 주의 — 그건 다른 항목입니다.)*
3. **앱 → 플랫폼 키 → 클라이언트 시크릿** — 활성화되어 있으면 코드를 `KAKAO_CLIENT_SECRET` 에 저장
4. **앱 → 제품 링크 관리 → 웹 도메인** 에 서비스 도메인 등록 (메시지 링크 이동 허용용)
5. **제품 설정 → 카카오 로그인 → 일반** — 사용 설정 **ON**
6. **제품 설정 → 카카오 로그인 → 동의항목** — `카카오톡 메시지 전송`(`talk_message`) 을 선택 동의로 설정
7. 브라우저에서 인가 코드 요청 (404 가 떠도 정상, 주소창의 `code` 값을 사용)

   ```
   https://kauth.kakao.com/oauth/authorize?client_id={REST_API_KEY}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fkakao&response_type=code&scope=talk_message
   ```

8. 10분 안에 `code` 로 토큰 교환 (인가 코드는 1회용)

   ```bash
   curl -X POST 'https://kauth.kakao.com/oauth/token' \
     -H 'Content-Type: application/x-www-form-urlencoded;charset=utf-8' \
     -d 'grant_type=authorization_code' \
     -d 'client_id={REST_API_KEY}' \
     -d 'client_secret={CLIENT_SECRET}' \
     -d 'redirect_uri=http://localhost:3000/oauth/kakao' \
     -d 'code={인가코드}'
   ```

9. 응답의 `refresh_token` 을 `.env` 의 `KAKAO_REFRESH_TOKEN` 에 저장 (`access_token` 은 저장 불필요)

**자주 만나는 에러**

| 코드 | 원인 |
|------|------|
| `KOE006` | Redirect URI 미등록/불일치 (2번) |
| `KOE010` | 클라이언트 시크릿이 켜져 있는데 `client_secret` 누락 (3번) |
| `invalid_grant` | 인가 코드 만료(10분) 또는 재사용 → 7번부터 다시 |

> 발송된 메시지는 카카오톡 **'나와의 채팅'** 방에 도착합니다. 일반 채팅 목록에 안 보이면
> 친구 탭 맨 위 내 프로필에서 열어보세요. 또한 토큰을 발급받은 카카오 계정과
> 카카오톡에 로그인된 계정이 같아야 합니다.

> `refresh_token` 은 약 2개월 유효하며, 만료가 가까워지면 갱신 응답에 새 값이 함께 내려옵니다.
> 이 경우 로그에 경고가 남으므로 `.env` 값을 교체하세요.

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/news` | 전체 카테고리 뉴스 조회 |
| GET | `/news?category=경제` | 카테고리별 뉴스 조회 |
| GET | `/card-news` | 오늘의 카드뉴스 조회 (없으면 생성) |
| GET | `/card-news?category=경제` | 카테고리별 카드뉴스 조회 |
| POST | `/scheduler/run` | 파이프라인 수동 실행 (수집 → 생성 → 발송) |
| POST | `/scheduler/send` | 저장된 당일 카드뉴스만 재발송 |

`POST` 엔드포인트는 `SCHEDULER_TRIGGER_TOKEN` 설정 시 `x-trigger-token` 헤더가 필요합니다.

```bash
curl -X POST http://localhost:3000/scheduler/run -H 'x-trigger-token: {TOKEN}'
```

## 이미지 호스팅

카카오는 메시지의 `image_url` 을 **자신의 서버가 직접 내려받는** 방식이라,
이미지 주소가 외부에서 접근 가능해야 합니다. (카카오에는 이미지 업로드 API 가 없습니다.)

| 제공자 | 이미지 주소 | 특징 |
|--------|-------------|------|
| `huggingface` | `{BASE_URL}/images/*.png` 로 직접 호스팅 | 빠르고(9건 약 25초) 품질이 좋음. **`BASE_URL` 이 공개 도메인이어야 이미지가 붙음** |
| `pollinations` | `image.pollinations.ai` 공개 URL | `BASE_URL` 없이도 이미지가 붙지만, 무료 서비스라 429/500 이 잦고 느림 |

`BASE_URL` 이 `localhost` 면 이미지 없이 텍스트만 발송됩니다. (경고 로그가 남습니다)

> 카카오는 **발송 시점에 이미지를 가져가 캐싱**합니다.
> 따라서 발송 이후에는 원본 주소가 죽어도 이미 보낸 메시지의 이미지는 그대로 남습니다.

로컬에서 이미지까지 확인하려면 터널로 잠깐 공개 주소를 만들면 됩니다.

```bash
cloudflared tunnel --url http://localhost:3000
# 출력된 https://xxxx.trycloudflare.com 을 BASE_URL 에 넣고 재시작
```

## 배포

`.env` 는 git 에 올리지 않습니다. 배포 환경에서는 **플랫폼의 환경 변수 기능**으로 주입하세요.

| 환경 | 주입 방법 |
|------|-----------|
| Railway / Render / Fly.io | 대시보드의 Variables / Secrets 에 키별로 등록 |
| Docker | `docker run --env-file .env ...` 또는 compose 의 `env_file:` <br>*(이미지 안에 `.env` 를 COPY 하지 말 것)* |
| VPS + systemd | `EnvironmentFile=/etc/daily-news.env` (파일 권한 `600`) |
| GitHub Actions 배포 | repository **Secrets** 에 저장 후 배포 스텝에서 주입 |

**배포 시 반드시 바꿔야 하는 값**

```bash
NODE_ENV=production
BASE_URL=https://실제-도메인          # 이미지가 카카오에 보이려면 필수
SCHEDULER_TRIGGER_TOKEN=랜덤한_긴_문자열
```

- `NODE_ENV=production` 이면 `SCHEDULER_TRIGGER_TOKEN` 없이는 수동 실행 API 가 401 로 막힙니다.
- 서버 타임존과 무관하게 `SCHEDULER_TIMEZONE`(기본 `Asia/Seoul`) 기준으로 cron 이 동작합니다.

**운영 중 주의**

- `KAKAO_REFRESH_TOKEN` 은 약 2개월 유효합니다. 만료가 가까워지면 갱신 응답에 새 값이
  함께 내려오고 `KakaoTokenProvider` 가 경고 로그를 남기지만, **새 값은 메모리에만 유지**됩니다.
  재시작하면 환경 변수 값으로 되돌아가므로, 경고가 보이면 환경 변수를 교체하세요.
- 이미지 생성은 외부 크레딧을 소모합니다. HuggingFace 무료 크레딧 소진 시 `402` 가 발생하며,
  이때는 크레딧을 충전하거나 `IMAGE_PROVIDER=pollinations` 로 전환하면 됩니다.

## 참고

- 카드뉴스는 `data/card-news/{YYYY-MM-DD}.json` 에 저장되며, 같은 날 재조회 시 외부 API 를 다시 호출하지 않습니다.
- 생성 이미지는 `public/images/` 에 저장되고 `IMAGE_RETENTION_DAYS` 경과 후 자동 정리됩니다.
- `.env`, `data/`, `public/images/` 는 git 에 커밋하지 않습니다.
- 개별 뉴스의 문구·이미지 생성이 실패해도 나머지는 그대로 발송됩니다. (부분 실패 허용)
