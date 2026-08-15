import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageGeneratorPort } from '../../domain/ports/image-generator.port';
import { ImageStorage } from '../image-storage';
import { retry } from '../../../../common/utils/retry';
import { describeError } from '../../../../common/utils/error';

/**
 * HuggingFace Inference Providers 의 이미지 생성 API.
 *
 * 구 엔드포인트(`/hf-inference/models/...`)는 FLUX 계열에 대해 410(deprecated)을
 * 반환하므로, provider 라우트(`/{provider}/v1/images/generations`)를 사용한다.
 * 사용 가능한 provider: nscale, together, wavespeed 등
 */
const DEFAULT_PROVIDER = 'nscale';
const DEFAULT_MODEL = 'black-forest-labs/FLUX.1-schnell';

interface HuggingFaceImageResponse {
  data?: { b64_json?: string; url?: string }[];
}

@Injectable()
export class HuggingFaceAdapter implements ImageGeneratorPort {
  private readonly logger = new Logger(HuggingFaceAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly imageStorage: ImageStorage,
  ) {}

  async generate(prompt: string): Promise<string> {
    const buffer = await retry(() => this.requestImage(prompt), {
      retries: 2,
      delayMs: 2000,
      onRetry: (error, attempt) =>
        this.logger.warn(
          `이미지 생성 재시도 ${attempt}회: ${describeError(error)}`,
        ),
    });

    return this.imageStorage.save(buffer);
  }

  private async requestImage(prompt: string): Promise<Buffer> {
    const token = this.configService.getOrThrow<string>('HF_TOKEN');
    const provider = this.configService.get<string>(
      'HF_IMAGE_PROVIDER',
      DEFAULT_PROVIDER,
    );
    const model = this.configService.get<string>(
      'HF_IMAGE_MODEL',
      DEFAULT_MODEL,
    );

    const response = await fetch(
      `https://router.huggingface.co/${provider}/v1/images/generations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: decorate(prompt),
          response_format: 'b64_json',
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `HuggingFace API 오류: ${response.status} ${await response.text()}`,
      );
    }

    const result = (await response.json()) as HuggingFaceImageResponse;
    const image = result.data?.[0];

    if (image?.b64_json) {
      return Buffer.from(image.b64_json, 'base64');
    }

    // provider 에 따라 base64 대신 URL 을 돌려주는 경우가 있다.
    if (image?.url) {
      const downloaded = await fetch(image.url);
      if (!downloaded.ok) {
        throw new Error(`이미지 다운로드 실패: ${downloaded.status}`);
      }
      return Buffer.from(await downloaded.arrayBuffer());
    }

    throw new Error('HuggingFace 응답에 이미지 데이터가 없습니다');
  }
}

function decorate(prompt: string): string {
  return `${prompt}, webtoon illustration style, vibrant colors, Korean news card`;
}
