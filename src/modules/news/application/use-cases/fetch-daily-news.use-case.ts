import { Injectable, Inject } from '@nestjs/common';
import { NewsEntity } from '../../domain/entities/news.entity';
import { NewsFetcherPort, NEWS_FETCHER_PORT } from '../../domain/ports/news-fetcher.port';

@Injectable()
export class FetchDailyNewsUseCase {
  constructor(
    @Inject(NEWS_FETCHER_PORT)
    private readonly newsFetcher: NewsFetcherPort,
  ) {}

  async execute(category?: string): Promise<NewsEntity[]> {
    throw new Error('Not implemented');
  }
}
