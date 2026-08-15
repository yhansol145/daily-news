import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { resolveBaseUrl } from '../../../common/config/base-url';

/** 생성된 이미지를 public/images 에 저장하고 접근 URL 을 돌려준다. */
@Injectable()
export class ImageStorage {
  private readonly imagesDir = join(process.cwd(), 'public', 'images');

  constructor(private readonly configService: ConfigService) {}

  async save(buffer: Buffer): Promise<string> {
    const filename = `${randomUUID()}.${detectExtension(buffer)}`;

    await mkdir(this.imagesDir, { recursive: true });
    await writeFile(join(this.imagesDir, filename), buffer);

    return `${resolveBaseUrl(this.configService)}/images/${filename}`;
  }
}

/**
 * 제공자마다 응답 형식(바이너리 / base64)이 달라 Content-Type 을 신뢰할 수 없다.
 * 매직 넘버로 확장자를 판별한다.
 */
export function detectExtension(buffer: Buffer): string {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return 'jpg';
}
