import { Controller, Get } from '@nestjs/common';
import { CardNewsService } from '../../application/services/card-news.service';

@Controller('card-news')
export class CardNewsController {
  constructor(private readonly cardNewsService: CardNewsService) {}
}
