import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { NewsEntity } from '../../domain/entities/news.entity';
import { NewsFetcherPort } from '../../domain/ports/news-fetcher.port';
import { retry } from '../../../../common/utils/retry';
import { describeError } from '../../../../common/utils/error';

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
  private readonly logger = new Logger(NewsFetcherAdapter.name);
  private readonly baseUrl = 'https://openapi.naver.com/v1/search/news.json';

  constructor(private readonly configService: ConfigService) {}

  async fetchDailyNews(category: string): Promise<NewsEntity[]> {
    const clientId = this.configService.getOrThrow<string>('NAVER_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>(
      'NAVER_CLIENT_SECRET',
    );
    const display = this.configService.get<number>('NEWS_PER_CATEGORY', 3);

    const url = `${this.baseUrl}?query=${encodeURIComponent(category)}&display=${display}&sort=sim`;

    const data = await retry(
      async () => {
        const response = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Naver News API error: ${response.status} ${response.statusText}`,
          );
        }

        return (await response.json()) as NaverNewsResponse;
      },
      {
        retries: 2,
        delayMs: 500,
        onRetry: (error, attempt) =>
          this.logger.warn(
            `${category} 뉴스 수집 재시도 ${attempt}회: ${describeError(error)}`,
          ),
      },
    );

    return data.items.map((item) => this.toEntity(item, category));
  }

  private toEntity(item: NaverNewsItem, category: string): NewsEntity {
    const url = item.originallink || item.link;

    const entity = new NewsEntity();
    entity.id = createHash('sha1').update(url).digest('hex').slice(0, 12);
    entity.title = this.stripHtml(item.title);
    entity.description = this.stripHtml(item.description);
    entity.url = url;
    entity.source = this.toHostname(url);
    entity.publishedAt = new Date(item.pubDate);
    entity.category = category;
    return entity;
  }

  private toHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private stripHtml(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();
  }
}
