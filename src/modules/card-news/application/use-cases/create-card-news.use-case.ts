import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import { LlmPort, LLM_PORT } from '../../domain/ports/llm.port';
import {
  ImageGeneratorPort,
  IMAGE_GENERATOR_PORT,
} from '../../domain/ports/image-generator.port';
import { mapSettledWithConcurrency } from '../../../../common/utils/retry';
import { describeError } from '../../../../common/utils/error';

const DEFAULT_CONCURRENCY = 3;

@Injectable()
export class CreateCardNewsUseCase {
  private readonly logger = new Logger(CreateCardNewsUseCase.name);

  constructor(
    @Inject(LLM_PORT)
    private readonly llm: LlmPort,
    @Inject(IMAGE_GENERATOR_PORT)
    private readonly imageGenerator: ImageGeneratorPort,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 외부 API(LLM, 이미지 생성) 호출이 많아 동시 실행 수를 제한한다.
   * 개별 뉴스가 실패해도 나머지는 카드뉴스로 만들어 반환한다.
   */
  async execute(newsItems: NewsEntity[]): Promise<CardNewsEntity[]> {
    const concurrency = this.configService.get<number>(
      'CARD_NEWS_CONCURRENCY',
      DEFAULT_CONCURRENCY,
    );

    const results = await mapSettledWithConcurrency(
      newsItems,
      concurrency,
      (news) => this.createOne(news),
    );

    const created: CardNewsEntity[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        created.push(result.value);
        return;
      }
      this.logger.error(
        `카드뉴스 생성 실패 (${newsItems[index].title}): ${describeError(result.reason)}`,
      );
    });

    if (created.length < newsItems.length) {
      this.logger.warn(
        `카드뉴스 ${newsItems.length}건 중 ${created.length}건 생성 성공`,
      );
    }

    // 실패분을 제외한 뒤에 번호를 매겨야 순번이 비지 않는다.
    created.forEach((cardNews, index) => {
      cardNews.number = index + 1;
    });

    return created;
  }

  private async createOne(news: NewsEntity): Promise<CardNewsEntity> {
    const content = await this.llm.generateCardNewsContent(news);
    const imageUrl = await this.imageGenerator.generate(content.imagePrompt);

    const entity = new CardNewsEntity();
    entity.headlineQuote = content.headlineQuote;
    entity.title = content.title;
    entity.bullets = content.bullets;
    entity.imageUrl = imageUrl;
    entity.sourceUrl = news.url;
    entity.category = news.category;
    entity.number = 0;
    entity.createdAt = new Date();
    return entity;
  }
}
