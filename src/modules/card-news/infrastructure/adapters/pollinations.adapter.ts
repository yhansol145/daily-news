import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ImageGeneratorPort } from '../../domain/ports/image-generator.port';
import { ImageStorage } from '../image-storage';
import { retry } from '../../../../common/utils/retry';
import { describeError } from '../../../../common/utils/error';

const API_BASE = 'https://image.pollinations.ai/prompt';
const DEFAULT_SIZE = 1024;
const DEFAULT_RETRY_DELAY_MS = 4000;
const STYLE_SUFFIX =
  'webtoon illustration style, vibrant colors, Korean news card';

/**
 * Pollinations 이미지 생성. API 키가 필요 없다.
 *
 * 기본 동작(POLLINATIONS_DIRECT_URL=true)은 pollinations.ai 의 공개 이미지 URL 을
 * 그대로 반환한다. 카카오 서버가 이미지를 직접 가져가므로, 서비스가 공개 도메인에
 * 배포되기 전에도 메시지에 이미지를 넣을 수 있다.
 */
@Injectable()
export class PollinationsAdapter implements ImageGeneratorPort {
  private readonly logger = new Logger(PollinationsAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly imageStorage: ImageStorage,
  ) {}

  async generate(prompt: string): Promise<string> {
    const url = this.buildUrl(prompt);

    // 요청을 한 번 보내 생성을 끝내둔다.
    // 이렇게 캐시를 데워두지 않으면 카카오가 URL 을 가져갈 때 생성 대기로 타임아웃될 수 있다.
    //
    // 무료 티어라 429/500 이 잦으므로 다른 어댑터보다 넉넉하게 기다린다. (기본 4s → 8s → 16s)
    const buffer = await retry(() => this.requestImage(url), {
      retries: 3,
      delayMs: this.configService.get<number>(
        'POLLINATIONS_RETRY_DELAY_MS',
        DEFAULT_RETRY_DELAY_MS,
      ),
      onRetry: (error, attempt) =>
        this.logger.warn(
          `이미지 생성 재시도 ${attempt}회: ${describeError(error)}`,
        ),
    });

    if (this.isDirectUrlMode()) {
      return url;
    }

    return this.imageStorage.save(buffer);
  }

  private isDirectUrlMode(): boolean {
    return (
      String(
        this.configService.get<string>('POLLINATIONS_DIRECT_URL', 'true'),
      ) !== 'false'
    );
  }

  private buildUrl(prompt: string): string {
    const size = this.configService.get<number>(
      'POLLINATIONS_IMAGE_SIZE',
      DEFAULT_SIZE,
    );
    const decorated = `${prompt}, ${STYLE_SUFFIX}`;

    // 같은 프롬프트는 항상 같은 이미지가 되도록 seed 를 고정한다.
    // (카카오가 URL 을 다시 가져가도 이미지가 바뀌지 않는다)
    const seed = parseInt(
      createHash('sha1').update(decorated).digest('hex').slice(0, 8),
      16,
    );

    return (
      `${API_BASE}/${encodeURIComponent(decorated)}` +
      `?width=${size}&height=${size}&nologo=true&seed=${seed}`
    );
  }

  private async requestImage(url: string): Promise<Buffer> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Pollinations API 오류: ${response.status} ${response.statusText}`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
