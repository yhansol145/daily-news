import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NewsService } from '../news/application/services/news.service';
import { CardNewsService } from '../card-news/application/services/card-news.service';
import { NotificationService } from '../notification/application/services/notification.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly newsService: NewsService,
    private readonly cardNewsService: CardNewsService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(process.env.NOTIFICATION_CRON ?? '0 8 * * *')
  async handleDailyNewsNotification(): Promise<void> {
    throw new Error('Not implemented');
  }
}
