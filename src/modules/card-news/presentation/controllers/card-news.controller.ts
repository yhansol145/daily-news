import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from '../../../news/application/services/news.service';
import { CardNewsService } from '../../application/services/card-news.service';

@Controller('card-news')
export class CardNewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly cardNewsService: CardNewsService,
  ) {}

  @Get()
  async getCardNews(@Query('category') category: string) {
    const newsItems = await this.newsService.getDailyNews(category);
    return this.cardNewsService.createFromNews(newsItems);
  }
}
