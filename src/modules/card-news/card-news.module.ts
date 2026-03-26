import { Module } from '@nestjs/common';
import { CardNewsController } from './presentation/controllers/card-news.controller';
import { CardNewsService } from './application/services/card-news.service';
import { CreateCardNewsUseCase } from './application/use-cases/create-card-news.use-case';
import { ClaudeAdapter } from './infrastructure/adapters/claude.adapter';
import { PollinationsAdapter } from './infrastructure/adapters/pollinations.adapter';
import { CLAUDE_PORT } from './domain/ports/claude.port';
import { IMAGE_GENERATOR_PORT } from './domain/ports/image-generator.port';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [NewsModule],
  controllers: [CardNewsController],
  providers: [
    CardNewsService,
    CreateCardNewsUseCase,
    { provide: CLAUDE_PORT, useClass: ClaudeAdapter },
    { provide: IMAGE_GENERATOR_PORT, useClass: PollinationsAdapter },
  ],
  exports: [CardNewsService],
})
export class CardNewsModule {}
