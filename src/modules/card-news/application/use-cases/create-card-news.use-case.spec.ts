import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateCardNewsUseCase } from './create-card-news.use-case';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsContent, LlmPort } from '../../domain/ports/llm.port';
import { ImageGeneratorPort } from '../../domain/ports/image-generator.port';

function makeNews(title: string): NewsEntity {
  const entity = new NewsEntity();
  entity.title = title;
  entity.description = `${title} 본문`;
  entity.url = `https://news.example.com/${encodeURIComponent(title)}`;
  entity.category = '경제';
  return entity;
}

const config = {
  get: (_key: string, defaultValue: number) => defaultValue,
} as unknown as ConfigService;

describe('CreateCardNewsUseCase', () => {
  let llm: LlmPort;
  let imageGenerator: ImageGeneratorPort;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    llm = {
      generateCardNewsContent: jest.fn(
        async (news: NewsEntity): Promise<CardNewsContent> => {
          if (news.title === '문구실패') throw new Error('LLM 오류');
          return {
            headlineQuote: '핵심',
            title: news.title,
            bullets: ['포인트1', '포인트2'],
            imagePrompt: 'prompt',
          };
        },
      ),
    };

    imageGenerator = {
      generate: jest.fn(async () => 'https://cdn.example.com/image.jpg'),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('뉴스 목록을 카드뉴스로 변환한다', async () => {
    const useCase = new CreateCardNewsUseCase(llm, imageGenerator, config);

    const result = await useCase.execute([makeNews('A'), makeNews('B')]);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('A');
    expect(result[0].imageUrl).toBe('https://cdn.example.com/image.jpg');
    expect(result[0].sourceUrl).toBe('https://news.example.com/A');
  });

  it('일부 뉴스가 실패해도 나머지는 카드뉴스로 만든다', async () => {
    const useCase = new CreateCardNewsUseCase(llm, imageGenerator, config);

    const result = await useCase.execute([
      makeNews('A'),
      makeNews('문구실패'),
      makeNews('B'),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((card) => card.title)).toEqual(['A', 'B']);
  });

  it('실패분을 제외한 뒤 번호를 1부터 순서대로 매긴다', async () => {
    const useCase = new CreateCardNewsUseCase(llm, imageGenerator, config);

    const result = await useCase.execute([
      makeNews('A'),
      makeNews('문구실패'),
      makeNews('B'),
    ]);

    expect(result.map((card) => card.number)).toEqual([1, 2]);
  });

  it('이미지 생성이 실패한 뉴스는 제외한다', async () => {
    imageGenerator.generate = jest.fn(async (prompt: string) => {
      if (prompt === 'prompt') throw new Error('HF 오류');
      return 'https://cdn.example.com/image.jpg';
    });
    const useCase = new CreateCardNewsUseCase(llm, imageGenerator, config);

    const result = await useCase.execute([makeNews('A')]);

    expect(result).toEqual([]);
  });

  it('빈 목록을 받으면 빈 배열을 반환한다', async () => {
    const useCase = new CreateCardNewsUseCase(llm, imageGenerator, config);

    await expect(useCase.execute([])).resolves.toEqual([]);
    expect(llm.generateCardNewsContent).not.toHaveBeenCalled();
  });
});
