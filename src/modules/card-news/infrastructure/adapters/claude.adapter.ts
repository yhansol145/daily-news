import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsContent, ClaudePort } from '../../domain/ports/claude.port';

@Injectable()
export class ClaudeAdapter implements ClaudePort {
  private readonly groq: Groq;

  constructor(private readonly configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.getOrThrow<string>('GROQ_API_KEY'),
    });
  }

  async generateCardNewsContent(news: NewsEntity): Promise<CardNewsContent> {
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `다음 뉴스를 카드뉴스 형식으로 변환해줘. JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.

뉴스 제목: ${news.title}
뉴스 내용: ${news.description}
카테고리: ${news.category}

응답 형식:
{
  "headlineQuote": "핵심 인용구 또는 핵심 메시지 (30자 이내, 따옴표 없이)",
  "title": "카드뉴스 제목 (40자 이내)",
  "bullets": ["핵심 포인트 1 (30자 이내)", "핵심 포인트 2 (30자 이내)", "핵심 포인트 3 (30자 이내)"],
  "imagePrompt": "영어로 된 이미지 생성 프롬프트. 뉴스 내용을 반영한 역동적인 만화/일러스트 스타일. 150자 이내."
}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0].message.content ?? '';
    return JSON.parse(text) as CardNewsContent;
  }
}
