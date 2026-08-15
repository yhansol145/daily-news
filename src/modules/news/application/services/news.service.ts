import { Injectable, Logger } from '@nestjs/common';
import { NewsEntity } from '../../domain/entities/news.entity';
import { NEWS_CATEGORIES } from '../../domain/news-category';
import { FetchDailyNewsUseCase } from '../use-cases/fetch-daily-news.use-case';
import { describeError } from '../../../../common/utils/error';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(private readonly fetchDailyNewsUseCase: FetchDailyNewsUseCase) {}

  /** 카테고리를 지정하지 않으면 전체 카테고리 뉴스를 합쳐서 반환한다. */
  async getDailyNews(category?: string): Promise<NewsEntity[]> {
    if (!category) {
      const byCategory = await this.getAllDailyNews();
      return Object.values(byCategory).flat();
    }
    return this.fetchDailyNewsUseCase.execute(category);
  }

  /**
   * 전체 카테고리를 병렬 수집한다.
   * 일부 카테고리가 실패해도 나머지 결과는 그대로 살린다.
   */
  async getAllDailyNews(): Promise<Record<string, NewsEntity[]>> {
    const results = await Promise.allSettled(
      NEWS_CATEGORIES.map((category) =>
        this.fetchDailyNewsUseCase.execute(category),
      ),
    );

    const entries = NEWS_CATEGORIES.map((category, index) => {
      const result = results[index];
      if (result.status === 'rejected') {
        this.logger.error(
          `${category} 뉴스 수집 실패: ${describeError(result.reason)}`,
        );
        return [category, [] as NewsEntity[]] as const;
      }
      return [category, result.value] as const;
    });

    return Object.fromEntries(entries);
  }
}
