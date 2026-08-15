import { Logger } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsEntity } from '../../domain/entities/news.entity';
import { NEWS_CATEGORIES } from '../../domain/news-category';
import { FetchDailyNewsUseCase } from '../use-cases/fetch-daily-news.use-case';

function makeNews(category: string): NewsEntity {
  const entity = new NewsEntity();
  entity.category = category;
  entity.title = `${category} 뉴스`;
  return entity;
}

function makeService(
  execute: (category: string) => Promise<NewsEntity[]>,
): NewsService {
  return new NewsService({ execute } as unknown as FetchDailyNewsUseCase);
}

describe('NewsService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('카테고리를 지정하면 해당 카테고리만 조회한다', async () => {
    const execute = jest.fn(async (category: string) => [makeNews(category)]);

    const result = await makeService(execute).getDailyNews('경제');

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith('경제');
    expect(result).toHaveLength(1);
  });

  it('카테고리를 지정하지 않으면 전체 카테고리를 합쳐 반환한다', async () => {
    const execute = jest.fn(async (category: string) => [makeNews(category)]);

    const result = await makeService(execute).getDailyNews();

    expect(execute).toHaveBeenCalledTimes(NEWS_CATEGORIES.length);
    expect(result).toHaveLength(NEWS_CATEGORIES.length);
  });

  it('일부 카테고리 수집이 실패해도 나머지 결과는 유지한다', async () => {
    const execute = jest.fn(async (category: string) => {
      if (category === '사회') throw new Error('네이버 API 오류');
      return [makeNews(category)];
    });

    const result = await makeService(execute).getAllDailyNews();

    expect(result['사회']).toEqual([]);
    expect(result['경제']).toHaveLength(1);
    expect(result['생활문화']).toHaveLength(1);
  });

  it('모든 카테고리가 실패해도 예외를 던지지 않는다', async () => {
    const execute = jest.fn(async () => {
      throw new Error('전면 장애');
    });

    await expect(makeService(execute).getDailyNews()).resolves.toEqual([]);
  });
});
