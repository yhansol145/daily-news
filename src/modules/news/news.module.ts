import { Module } from '@nestjs/common';
import { NewsController } from './presentation/controllers/news.controller';
import { NewsService } from './application/services/news.service';
import { FetchDailyNewsUseCase } from './application/use-cases/fetch-daily-news.use-case';
import { NewsFetcherAdapter } from './infrastructure/adapters/news-fetcher.adapter';
import { NEWS_FETCHER_PORT } from './domain/ports/news-fetcher.port';

@Module({
  controllers: [NewsController],
  providers: [
    NewsService,
    FetchDailyNewsUseCase,
    {
      provide: NEWS_FETCHER_PORT,
      useClass: NewsFetcherAdapter,
    },
  ],
  exports: [NewsService],
})
export class NewsModule {}
