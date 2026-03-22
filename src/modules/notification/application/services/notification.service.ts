import { Injectable } from '@nestjs/common';
import { CardNewsEntity } from '../../../card-news/domain/entities/card-news.entity';
import { SendNotificationUseCase } from '../use-cases/send-notification.use-case';

@Injectable()
export class NotificationService {
  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  async sendDailyNews(cardNewsItems: CardNewsEntity[]): Promise<void> {
    throw new Error('Not implemented');
  }
}
