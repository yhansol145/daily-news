import { Injectable } from '@nestjs/common';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import { CreateCardNewsUseCase } from '../use-cases/create-card-news.use-case';

@Injectable()
export class CardNewsService {
  constructor(
    private readonly createCardNewsUseCase: CreateCardNewsUseCase,
  ) {}

  async createFromNews(newsItems: NewsEntity[]): Promise<CardNewsEntity[]> {
    return this.createCardNewsUseCase.execute(newsItems);
  }
}
