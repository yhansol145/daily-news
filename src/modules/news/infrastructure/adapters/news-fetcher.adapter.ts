import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NewsEntity } from '../../domain/entities/news.entity';
import { NewsFetcherPort } from '../../domain/ports/news-fetcher.port';

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverNewsResponse {
  items: NaverNewsItem[];
}

@Injectable()
export class NewsFetcherAdapter implements NewsFetcherPort {
  private readonly baseUrl = 'https://openapi.naver.com/v1/search/news.json';

  constructor(private readonly configService: ConfigService) {}

  async fetchDailyNews(category: string): Promise<NewsEntity[]> {
    const clientId = this.configService.getOrThrow<string>('NAVER_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>('NAVER_CLIENT_SECRET');

    const url = `${this.baseUrl}?query=${encodeURIComponent(category)}&display=5&sort=sim`;
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`Naver News API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as NaverNewsResponse;
    return data.items.map((item) => this.toEntity(item, category));
  }

  private toEntity(item: NaverNewsItem, category: string): NewsEntity {
    const entity = new NewsEntity();
    entity.title = this.stripHtml(item.title);
    entity.description = this.stripHtml(item.description);
    entity.url = item.originallink || item.link;
    entity.source = new URL(item.originallink || item.link).hostname;
    entity.publishedAt = new Date(item.pubDate);
    entity.category = category;
    return entity;
  }

  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  }
}
