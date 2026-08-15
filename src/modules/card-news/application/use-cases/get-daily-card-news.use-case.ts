import { Injectable, Inject } from '@nestjs/common';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import {
  CardNewsRepositoryPort,
  CARD_NEWS_REPOSITORY_PORT,
} from '../../domain/ports/card-news-repository.port';
import { GenerateDailyCardNewsUseCase } from './generate-daily-card-news.use-case';
import { todayKst } from '../../../../common/utils/date';

/**
 * 저장된 당일 카드뉴스를 반환한다.
 * 아직 생성되지 않았을 때만 새로 생성한다. (LLM·이미지 API 호출 비용 방지)
 */
@Injectable()
export class GetDailyCardNewsUseCase {
  constructor(
    @Inject(CARD_NEWS_REPOSITORY_PORT)
    private readonly repository: CardNewsRepositoryPort,
    private readonly generateDailyCardNewsUseCase: GenerateDailyCardNewsUseCase,
  ) {}

  async execute(
    category?: string,
    date: string = todayKst(),
  ): Promise<CardNewsEntity[]> {
    const saved = await this.repository.findByDate(date);
    const items =
      saved ?? (await this.generateDailyCardNewsUseCase.execute(date));

    if (!category) return items;
    return items.filter((item) => item.category === category);
  }
}
