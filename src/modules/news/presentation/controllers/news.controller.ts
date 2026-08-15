import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { NewsService } from '../../application/services/news.service';
import { NEWS_CATEGORIES, isNewsCategory } from '../../domain/news-category';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getDailyNews(@Query('category') category?: string) {
    if (category && !isNewsCategory(category)) {
      throw new BadRequestException(
        `지원하지 않는 카테고리입니다. (사용 가능: ${NEWS_CATEGORIES.join(', ')})`,
      );
    }
    return this.newsService.getDailyNews(category);
  }
}
