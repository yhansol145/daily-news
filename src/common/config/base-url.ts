import { ConfigService } from '@nestjs/config';

const LOCAL_HOST_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i;

/** 외부에 노출할 서비스 기본 URL. `BASE_URL` 이 없으면 로컬 주소로 폴백한다. */
export function resolveBaseUrl(configService: ConfigService): string {
  const explicit = configService.get<string>('BASE_URL');
  if (explicit && explicit.trim() !== '') {
    return explicit.trim().replace(/\/+$/, '');
  }
  const port = configService.get<string>('PORT', '3000');
  return `http://localhost:${port}`;
}

/**
 * 카카오 서버가 실제로 접근 가능한 주소인지 판단한다.
 * localhost 주소로 만든 이미지 URL 은 카카오가 불러올 수 없다.
 */
export function isPubliclyReachable(baseUrl: string): boolean {
  return !LOCAL_HOST_PATTERN.test(baseUrl);
}
