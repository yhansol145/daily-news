import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { NewsModule } from '../news/news.module';
import { CardNewsModule } from '../card-news/card-news.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NewsModule, CardNewsModule, NotificationModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
