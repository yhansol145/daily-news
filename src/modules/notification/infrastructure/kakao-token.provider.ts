import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retry } from '../../../common/utils/retry';
import { describeError } from '../../../common/utils/error';

interface KakaoTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';

/** 만료 직전 호출로 401 이 나는 것을 막기 위한 여유 시간 */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * refresh token 으로 access token 을 발급·캐싱한다.
 *
 * refresh token 자체는 카카오 OAuth 동의 절차를 거쳐 직접 발급받아
 * `.env` 의 KAKAO_REFRESH_TOKEN 에 넣어야 한다. (README 참고)
 */
@Injectable()
export class KakaoTokenProvider {
  private readonly logger = new Logger(KakaoTokenProvider.name);

  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshToken: string | null = null;
  private inFlight: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }

    // 동시 호출이 각각 갱신 요청을 보내지 않도록 하나로 묶는다.
    this.inFlight ??= this.refreshAccessToken().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  /** 401 응답을 받았을 때 캐시된 토큰을 버리고 다음 호출에서 재발급하게 한다. */
  invalidate(): void {
    this.accessToken = null;
    this.expiresAt = 0;
  }

  private async refreshAccessToken(): Promise<string> {
    const clientId =
      this.configService.getOrThrow<string>('KAKAO_REST_API_KEY');
    const refreshToken =
      this.refreshToken ??
      this.configService.getOrThrow<string>('KAKAO_REFRESH_TOKEN');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');
    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    const token = await retry(
      async () => {
        const response = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
          body,
        });

        if (!response.ok) {
          throw new Error(
            `카카오 토큰 갱신 실패: ${response.status} ${await response.text()}`,
          );
        }

        return (await response.json()) as KakaoTokenResponse;
      },
      {
        retries: 2,
        delayMs: 1000,
        onRetry: (error, attempt) =>
          this.logger.warn(
            `카카오 토큰 갱신 재시도 ${attempt}회: ${describeError(error)}`,
          ),
      },
    );

    this.accessToken = token.access_token;
    this.expiresAt = Date.now() + token.expires_in * 1000 - EXPIRY_MARGIN_MS;

    // 기존 refresh token 의 잔여 기간이 짧으면 카카오가 새 값을 함께 내려준다.
    if (token.refresh_token) {
      this.refreshToken = token.refresh_token;
      this.logger.warn(
        '카카오가 새 refresh token 을 발급했습니다. .env 의 KAKAO_REFRESH_TOKEN 을 갱신하세요.',
      );
    }

    this.logger.log('카카오 access token 발급 완료');
    return this.accessToken;
  }
}
