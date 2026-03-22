import { Injectable, Inject } from '@nestjs/common';
import { CardNewsEntity } from '../../../card-news/domain/entities/card-news.entity';
import { NotificationPort, NOTIFICATION_PORT } from '../../domain/ports/notification.port';

@Injectable()
export class SendNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_PORT)
    private readonly notificationPort: NotificationPort,
  ) {}

  async execute(cardNewsItems: CardNewsEntity[]): Promise<void> {
    throw new Error('Not implemented');
  }
}
