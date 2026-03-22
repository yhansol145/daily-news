import { Module } from '@nestjs/common';
import { NotificationService } from './application/services/notification.service';
import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { KakaoNotificationAdapter } from './infrastructure/adapters/kakao-notification.adapter';
import { NOTIFICATION_PORT } from './domain/ports/notification.port';

@Module({
  providers: [
    NotificationService,
    SendNotificationUseCase,
    {
      provide: NOTIFICATION_PORT,
      useClass: KakaoNotificationAdapter,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
