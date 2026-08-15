import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PipelineResult, SchedulerService } from '../../scheduler.service';

/**
 * cron 시각을 기다리지 않고 파이프라인을 수동 실행하기 위한 엔드포인트.
 * 외부 API 비용과 실제 발송이 발생하므로 SCHEDULER_TRIGGER_TOKEN 으로 보호한다.
 */
@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly configService: ConfigService,
  ) {}

  /** 뉴스 수집부터 발송까지 전체 실행 */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(
    @Headers('x-trigger-token') token?: string,
  ): Promise<PipelineResult> {
    this.assertAllowed(token);
    return this.schedulerService.runDailyPipeline();
  }

  /** 이미 생성된 당일 카드뉴스만 재발송 */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(
    @Headers('x-trigger-token') token?: string,
  ): Promise<PipelineResult> {
    this.assertAllowed(token);
    return this.schedulerService.sendSavedCardNews();
  }

  private assertAllowed(token?: string): void {
    const expected = this.configService.get<string>('SCHEDULER_TRIGGER_TOKEN');

    if (expected) {
      if (token !== expected) {
        throw new UnauthorizedException('트리거 토큰이 올바르지 않습니다');
      }
      return;
    }

    // 토큰 미설정 시 개발 환경에서만 허용한다.
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException(
        '운영 환경에서는 SCHEDULER_TRIGGER_TOKEN 설정이 필요합니다',
      );
    }
  }
}
