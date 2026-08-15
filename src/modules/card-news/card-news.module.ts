import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardNewsController } from './presentation/controllers/card-news.controller';
import { CardNewsService } from './application/services/card-news.service';
import { CreateCardNewsUseCase } from './application/use-cases/create-card-news.use-case';
import { GenerateDailyCardNewsUseCase } from './application/use-cases/generate-daily-card-news.use-case';
import { GetDailyCardNewsUseCase } from './application/use-cases/get-daily-card-news.use-case';
import { GroqAdapter } from './infrastructure/adapters/groq.adapter';
import { HuggingFaceAdapter } from './infrastructure/adapters/huggingface.adapter';
import { PollinationsAdapter } from './infrastructure/adapters/pollinations.adapter';
import { FileCardNewsRepository } from './infrastructure/adapters/file-card-news.repository';
import { ImageStorage } from './infrastructure/image-storage';
import { LLM_PORT } from './domain/ports/llm.port';
import { IMAGE_GENERATOR_PORT } from './domain/ports/image-generator.port';
import { CARD_NEWS_REPOSITORY_PORT } from './domain/ports/card-news-repository.port';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [NewsModule],
  controllers: [CardNewsController],
  providers: [
    CardNewsService,
    CreateCardNewsUseCase,
    GenerateDailyCardNewsUseCase,
    GetDailyCardNewsUseCase,
    ImageStorage,
    { provide: LLM_PORT, useClass: GroqAdapter },
    { provide: CARD_NEWS_REPOSITORY_PORT, useClass: FileCardNewsRepository },
    {
      // IMAGE_PROVIDER 로 이미지 생성 제공자를 교체한다. (huggingface | pollinations)
      provide: IMAGE_GENERATOR_PORT,
      inject: [ConfigService, ImageStorage],
      useFactory: (configService: ConfigService, imageStorage: ImageStorage) =>
        configService.get<string>('IMAGE_PROVIDER', 'huggingface') ===
        'pollinations'
          ? new PollinationsAdapter(configService, imageStorage)
          : new HuggingFaceAdapter(configService, imageStorage),
    },
  ],
  exports: [CardNewsService],
})
export class CardNewsModule {}
