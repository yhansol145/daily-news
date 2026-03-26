import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ImageGeneratorPort } from '../../domain/ports/image-generator.port';

@Injectable()
export class PollinationsAdapter implements ImageGeneratorPort {
  private readonly apiUrl =
    'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';
  private readonly imagesDir = join(process.cwd(), 'public', 'images');

  constructor(private readonly configService: ConfigService) {}

  async generate(prompt: string): Promise<string> {
    const token = this.configService.getOrThrow<string>('HF_TOKEN');

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `${prompt}, webtoon illustration style, vibrant colors, Korean news card`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} ${error}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!existsSync(this.imagesDir)) {
      await mkdir(this.imagesDir, { recursive: true });
    }

    const filename = `${Date.now()}.jpg`;
    await writeFile(join(this.imagesDir, filename), buffer);

    const port = this.configService.get<number>('PORT', 3000);
    return `http://localhost:${port}/images/${filename}`;
  }
}
