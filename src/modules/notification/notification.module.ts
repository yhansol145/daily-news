import { Module } from '@nestjs/common';
import { NotificationService } from './application/services/notification.service';
import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { KakaoNotificationAdapter } from './infrastructure/adapters/kakao-notification.adapter';
import { KakaoTokenProvider } from './infrastructure/kakao-token.provider';
import { NOTIFICATION_PORT } from './domain/ports/notification.port';

@Module({
  providers: [
    NotificationService,
    SendNotificationUseCase,
    KakaoTokenProvider,
    {
      provide: NOTIFICATION_PORT,
      useClass: KakaoNotificationAdapter,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
