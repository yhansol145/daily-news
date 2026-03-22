import { CardNewsEntity } from '../../../card-news/domain/entities/card-news.entity';

export interface NotificationPort {
  send(cardNewsItems: CardNewsEntity[]): Promise<void>;
}

export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');
