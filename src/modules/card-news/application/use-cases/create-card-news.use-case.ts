import { Injectable, Inject } from '@nestjs/common';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import { ClaudePort, CLAUDE_PORT } from '../../domain/ports/claude.port';
import { ImageGeneratorPort, IMAGE_GENERATOR_PORT } from '../../domain/ports/image-generator.port';

@Injectable()
export class CreateCardNewsUseCase {
  constructor(
    @Inject(CLAUDE_PORT)
    private readonly claude: ClaudePort,
    @Inject(IMAGE_GENERATOR_PORT)
    private readonly imageGenerator: ImageGeneratorPort,
  ) {}

  async execute(newsItems: NewsEntity[]): Promise<CardNewsEntity[]> {
    return Promise.all(
      newsItems.map((news, index) => this.createOne(news, index + 1)),
    );
  }

  private async createOne(news: NewsEntity, number: number): Promise<CardNewsEntity> {
    const content = await this.claude.generateCardNewsContent(news);
    const imageUrl = await this.imageGenerator.generate(content.imagePrompt);

    const entity = new CardNewsEntity();
    entity.headlineQuote = content.headlineQuote;
    entity.title = content.title;
    entity.bullets = content.bullets;
    entity.imageUrl = imageUrl;
    entity.sourceUrl = news.url;
    entity.category = news.category;
    entity.number = number;
    entity.createdAt = new Date();
    return entity;
  }
}
