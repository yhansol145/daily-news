import { Module } from '@nestjs/common';
import { CardNewsController } from './presentation/controllers/card-news.controller';
import { CardNewsService } from './application/services/card-news.service';
import { CreateCardNewsUseCase } from './application/use-cases/create-card-news.use-case';

@Module({
  controllers: [CardNewsController],
  providers: [CardNewsService, CreateCardNewsUseCase],
  exports: [CardNewsService],
})
export class CardNewsModule {}
