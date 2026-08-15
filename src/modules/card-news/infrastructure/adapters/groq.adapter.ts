import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsContent, LlmPort } from '../../domain/ports/llm.port';
import { retry } from '../../../../common/utils/retry';
import { describeError } from '../../../../common/utils/error';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

@Injectable()
export class GroqAdapter implements LlmPort {
  private readonly logger = new Logger(GroqAdapter.name);
  private readonly groq: Groq;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.getOrThrow<string>('GROQ_API_KEY'),
    });
    this.model = this.configService.get<string>('GROQ_MODEL', DEFAULT_MODEL);
  }

  async generateCardNewsContent(news: NewsEntity): Promise<CardNewsContent> {
    return retry(() => this.requestContent(news), {
      retries: 2,
      delayMs: 1000,
      onRetry: (error, attempt) =>
        this.logger.warn(
          `카드뉴스 문구 생성 재시도 ${attempt}회 (${news.title}): ${describeError(error)}`,
        ),
    });
  }

  private async requestContent(news: NewsEntity): Promise<CardNewsContent> {
    const completion = await this.groq.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: this.buildPrompt(news) }],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content ?? '';
    return this.normalize(this.parse(text), news);
  }

  private buildPrompt(news: NewsEntity): string {
    return `다음 뉴스를 카드뉴스 형식으로 변환해줘. JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.

뉴스 제목: ${news.title}
뉴스 내용: ${news.description}
카테고리: ${news.category}

응답 형식:
{
  "headlineQuote": "핵심 인용구 또는 핵심 메시지 (30자 이내, 따옴표 없이)",
  "title": "카드뉴스 제목 (40자 이내)",
  "bullets": ["핵심 포인트 1 (30자 이내)", "핵심 포인트 2 (30자 이내)", "핵심 포인트 3 (30자 이내)"],
  "imagePrompt": "영어로 된 이미지 생성 프롬프트. 뉴스 내용을 반영한 역동적인 만화/일러스트 스타일. 150자 이내."
}`;
  }

  private parse(text: string): Partial<CardNewsContent> {
    try {
      return JSON.parse(text) as Partial<CardNewsContent>;
    } catch {
      throw new Error(
        `LLM 응답을 JSON 으로 파싱하지 못했습니다: ${text.slice(0, 200)}`,
      );
    }
  }

  /** LLM 응답은 형식이 흔들릴 수 있으므로 필수 필드를 검증하고 보정한다. */
  private normalize(
    raw: Partial<CardNewsContent>,
    news: NewsEntity,
  ): CardNewsContent {
    const bullets = Array.isArray(raw.bullets)
      ? raw.bullets
          .filter((bullet): bullet is string => typeof bullet === 'string')
          .map((bullet) => bullet.trim())
          .filter((bullet) => bullet !== '')
      : [];

    const title = typeof raw.title === 'string' ? raw.title.trim() : '';

    if (title === '' || bullets.length === 0) {
      throw new Error('LLM 응답에 title 또는 bullets 가 없습니다');
    }

    return {
      headlineQuote:
        typeof raw.headlineQuote === 'string' && raw.headlineQuote.trim() !== ''
          ? raw.headlineQuote.trim()
          : title,
      title,
      bullets: bullets.slice(0, 3),
      imagePrompt:
        typeof raw.imagePrompt === 'string' && raw.imagePrompt.trim() !== ''
          ? raw.imagePrompt.trim()
          : `news illustration about ${news.category}`,
    };
  }
}
