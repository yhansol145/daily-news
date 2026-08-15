import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CardNewsService } from '../../application/services/card-news.service';
import {
  NEWS_CATEGORIES,
  isNewsCategory,
} from '../../../news/domain/news-category';

@Controller('card-news')
export class CardNewsController {
  constructor(private readonly cardNewsService: CardNewsService) {}

  @Get()
  async getCardNews(@Query('category') category?: string) {
    if (category && !isNewsCategory(category)) {
      throw new BadRequestException(
        `지원하지 않는 카테고리입니다. (사용 가능: ${NEWS_CATEGORIES.join(', ')})`,
      );
    }
    return this.cardNewsService.getDaily(category);
  }
}
