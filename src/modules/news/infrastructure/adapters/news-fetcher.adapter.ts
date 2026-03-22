import { Injectable } from '@nestjs/common';
import { NewsEntity } from '../../domain/entities/news.entity';
import { NewsFetcherPort } from '../../domain/ports/news-fetcher.port';

@Injectable()
export class NewsFetcherAdapter implements NewsFetcherPort {
  async fetchDailyNews(category?: string): Promise<NewsEntity[]> {
    throw new Error('Not implemented');
  }
}
