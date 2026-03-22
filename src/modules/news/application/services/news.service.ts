import { Injectable } from '@nestjs/common';
import { NewsEntity } from '../../domain/entities/news.entity';
import { FetchDailyNewsUseCase } from '../use-cases/fetch-daily-news.use-case';

@Injectable()
export class NewsService {
  constructor(
    private readonly fetchDailyNewsUseCase: FetchDailyNewsUseCase,
  ) {}

  async getDailyNews(category?: string): Promise<NewsEntity[]> {
    throw new Error('Not implemented');
  }
}
