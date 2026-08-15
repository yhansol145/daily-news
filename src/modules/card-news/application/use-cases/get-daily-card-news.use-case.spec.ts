import { GetDailyCardNewsUseCase } from './get-daily-card-news.use-case';
import { GenerateDailyCardNewsUseCase } from './generate-daily-card-news.use-case';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import { CardNewsRepositoryPort } from '../../domain/ports/card-news-repository.port';

const DATE = '2026-08-15';

function makeCard(category: string): CardNewsEntity {
  const entity = new CardNewsEntity();
  entity.category = category;
  entity.title = `${category} 카드뉴스`;
  entity.bullets = ['포인트'];
  entity.createdAt = new Date();
  return entity;
}

describe('GetDailyCardNewsUseCase', () => {
  it('저장된 카드뉴스가 있으면 새로 생성하지 않는다', async () => {
    const repository: CardNewsRepositoryPort = {
      findByDate: jest.fn(async () => [makeCard('경제')]),
      save: jest.fn(),
    };
    const generate = { execute: jest.fn() };

    const result = await new GetDailyCardNewsUseCase(
      repository,
      generate as unknown as GenerateDailyCardNewsUseCase,
    ).execute(undefined, DATE);

    expect(generate.execute).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('저장된 카드뉴스가 없으면 생성한다', async () => {
    const repository: CardNewsRepositoryPort = {
      findByDate: jest.fn(async () => null),
      save: jest.fn(),
    };
    const generate = { execute: jest.fn(async () => [makeCard('경제')]) };

    const result = await new GetDailyCardNewsUseCase(
      repository,
      generate as unknown as GenerateDailyCardNewsUseCase,
    ).execute(undefined, DATE);

    expect(generate.execute).toHaveBeenCalledWith(DATE);
    expect(result).toHaveLength(1);
  });

  it('카테고리를 지정하면 해당 카테고리만 반환한다', async () => {
    const repository: CardNewsRepositoryPort = {
      findByDate: jest.fn(async () => [makeCard('경제'), makeCard('사회')]),
      save: jest.fn(),
    };
    const generate = { execute: jest.fn() };

    const result = await new GetDailyCardNewsUseCase(
      repository,
      generate as unknown as GenerateDailyCardNewsUseCase,
    ).execute('경제', DATE);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('경제');
  });
});
