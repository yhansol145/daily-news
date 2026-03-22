import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsModule } from './modules/news/news.module';
import { CardNewsModule } from './modules/card-news/card-news.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    NewsModule,
    CardNewsModule,
    NotificationModule,
    SchedulerModule,
  ],
})
export class AppModule {}
