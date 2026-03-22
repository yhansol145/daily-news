import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from '../../application/services/news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getDailyNews(@Query('category') category?: string) {
    return this.newsService.getDailyNews(category);
  }
}
