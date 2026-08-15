import { Injectable, Inject, Logger } from '@nestjs/common';
import { NewsService } from '../../../news/application/services/news.service';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import {
  CardNewsRepositoryPort,
  CARD_NEWS_REPOSITORY_PORT,
} from '../../domain/ports/card-news-repository.port';
import { CreateCardNewsUseCase } from './create-card-news.use-case';
import { todayKst } from '../../../../common/utils/date';

/** 전체 카테고리 뉴스를 수집해 카드뉴스로 만들고 저장한다. */
@Injectable()
export class GenerateDailyCardNewsUseCase {
  private readonly logger = new Logger(GenerateDailyCardNewsUseCase.name);

  constructor(
    private readonly newsService: NewsService,
    private readonly createCardNewsUseCase: CreateCardNewsUseCase,
    @Inject(CARD_NEWS_REPOSITORY_PORT)
    private readonly repository: CardNewsRepositoryPort,
  ) {}

  async execute(date: string = todayKst()): Promise<CardNewsEntity[]> {
    const newsItems = await this.newsService.getDailyNews();
    this.logger.log(`뉴스 ${newsItems.length}건 수집 완료`);

    if (newsItems.length === 0) {
      this.logger.warn('수집된 뉴스가 없어 카드뉴스를 생성하지 않습니다');
      return [];
    }

    const cardNews = await this.createCardNewsUseCase.execute(newsItems);

    if (cardNews.length > 0) {
      await this.repository.save(date, cardNews);
    }

    return cardNews;
  }
}
