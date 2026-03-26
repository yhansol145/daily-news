import { Injectable } from '@nestjs/common';
import { NewsEntity } from '../../domain/entities/news.entity';
import { NEWS_CATEGORIES } from '../../domain/news-category';
import { FetchDailyNewsUseCase } from '../use-cases/fetch-daily-news.use-case';

@Injectable()
export class NewsService {
  constructor(
    private readonly fetchDailyNewsUseCase: FetchDailyNewsUseCase,
  ) {}

  async getDailyNews(category: string): Promise<NewsEntity[]> {
    return this.fetchDailyNewsUseCase.execute(category);
  }

  async getAllDailyNews(): Promise<Record<string, NewsEntity[]>> {
    const results = await Promise.all(
      NEWS_CATEGORIES.map((category) =>
        this.fetchDailyNewsUseCase.execute(category),
      ),
    );
    return Object.fromEntries(
      NEWS_CATEGORIES.map((category, i) => [category, results[i]]),
    );
  }
}
