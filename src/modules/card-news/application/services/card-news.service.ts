import { Injectable } from '@nestjs/common';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import { CreateCardNewsUseCase } from '../use-cases/create-card-news.use-case';
import { GenerateDailyCardNewsUseCase } from '../use-cases/generate-daily-card-news.use-case';
import { GetDailyCardNewsUseCase } from '../use-cases/get-daily-card-news.use-case';

@Injectable()
export class CardNewsService {
  constructor(
    private readonly createCardNewsUseCase: CreateCardNewsUseCase,
    private readonly generateDailyCardNewsUseCase: GenerateDailyCardNewsUseCase,
    private readonly getDailyCardNewsUseCase: GetDailyCardNewsUseCase,
  ) {}

  /** 저장된 당일 카드뉴스를 조회한다. 없으면 생성한다. */
  async getDaily(category?: string): Promise<CardNewsEntity[]> {
    return this.getDailyCardNewsUseCase.execute(category);
  }

  /** 당일 카드뉴스를 새로 생성하고 저장한다. (스케줄러 진입점) */
  async generateDaily(): Promise<CardNewsEntity[]> {
    return this.generateDailyCardNewsUseCase.execute();
  }

  /** 주어진 뉴스 목록으로 카드뉴스를 만든다. (저장하지 않음) */
  async createFromNews(newsItems: NewsEntity[]): Promise<CardNewsEntity[]> {
    return this.createCardNewsUseCase.execute(newsItems);
  }
}
