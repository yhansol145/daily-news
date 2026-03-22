import { Injectable } from '@nestjs/common';
import { CardNewsEntity } from '../../../card-news/domain/entities/card-news.entity';
import { NotificationPort } from '../../domain/ports/notification.port';

@Injectable()
export class KakaoNotificationAdapter implements NotificationPort {
  async send(cardNewsItems: CardNewsEntity[]): Promise<void> {
    throw new Error('Not implemented');
  }
}
