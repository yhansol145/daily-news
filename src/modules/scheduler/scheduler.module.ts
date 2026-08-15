import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './presentation/controllers/scheduler.controller';
import { CardNewsModule } from '../card-news/card-news.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [CardNewsModule, NotificationModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
