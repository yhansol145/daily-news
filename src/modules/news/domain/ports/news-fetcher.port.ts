import { NewsEntity } from '../entities/news.entity';

export interface NewsFetcherPort {
  fetchDailyNews(category?: string): Promise<NewsEntity[]>;
}

export const NEWS_FETCHER_PORT = Symbol('NEWS_FETCHER_PORT');
