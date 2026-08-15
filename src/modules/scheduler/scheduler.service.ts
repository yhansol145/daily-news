import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { CardNewsService } from '../card-news/application/services/card-news.service';
import { NotificationService } from '../notification/application/services/notification.service';
import { describeError } from '../../common/utils/error';

const JOB_NAME = 'daily-news-notification';
const DEFAULT_CRON = '0 8 * * *';
const DEFAULT_TIMEZONE = 'Asia/Seoul';
const DEFAULT_IMAGE_RETENTION_DAYS = 7;

export interface PipelineResult {
  cardNewsCount: number;
  notified: boolean;
  error?: string;
}

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly imagesDir = join(process.cwd(), 'public', 'images');
  private running = false;

  constructor(
    private readonly cardNewsService: CardNewsService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * @Cron 데코레이터는 ConfigModule 이 .env 를 읽기 전에 평가되어
   * NOTIFICATION_CRON 이 반영되지 않는다. 그래서 런타임에 직접 등록한다.
   */
  onModuleInit(): void {
    const expression = this.configService.get<string>(
      'NOTIFICATION_CRON',
      DEFAULT_CRON,
    );
    const timeZone = this.configService.get<string>(
      'SCHEDULER_TIMEZONE',
      DEFAULT_TIMEZONE,
    );

    try {
      const job = new CronJob(
        expression,
        () => {
          void this.runDailyPipeline();
        },
        null,
        false,
        timeZone,
      );

      this.schedulerRegistry.addCronJob(JOB_NAME, job as never);
      job.start();

      this.logger.log(
        `일일 카드뉴스 스케줄 등록 완료: "${expression}" (${timeZone})`,
      );
    } catch (error) {
      this.logger.error(
        `스케줄 등록 실패 (cron: "${expression}"): ${describeError(error)}`,
      );
    }
  }

  /** 뉴스 수집 → 카드뉴스 생성/저장 → 카카오 발송 */
  async runDailyPipeline(): Promise<PipelineResult> {
    if (this.running) {
      this.logger.warn('이미 실행 중인 파이프라인이 있어 요청을 무시합니다');
      return {
        cardNewsCount: 0,
        notified: false,
        error: '이미 실행 중입니다',
      };
    }

    this.running = true;
    const startedAt = Date.now();

    try {
      this.logger.log('일일 카드뉴스 파이프라인 시작');

      const cardNews = await this.cardNewsService.generateDaily();
      if (cardNews.length === 0) {
        this.logger.warn('생성된 카드뉴스가 없어 발송을 건너뜁니다');
        return {
          cardNewsCount: 0,
          notified: false,
          error: '생성된 카드뉴스가 없습니다',
        };
      }

      await this.notificationService.sendDailyNews(cardNews);

      const elapsed = Date.now() - startedAt;
      this.logger.log(
        `파이프라인 완료: 카드뉴스 ${cardNews.length}건 발송 (${elapsed}ms)`,
      );

      return { cardNewsCount: cardNews.length, notified: true };
    } catch (error) {
      const message = describeError(error);
      this.logger.error(`파이프라인 실패: ${message}`);
      return { cardNewsCount: 0, notified: false, error: message };
    } finally {
      this.running = false;
      await this.cleanupOldImages();
    }
  }

  /** 이미 생성된 당일 카드뉴스를 재생성 없이 다시 발송한다. */
  async sendSavedCardNews(): Promise<PipelineResult> {
    try {
      const cardNews = await this.cardNewsService.getDaily();
      if (cardNews.length === 0) {
        return {
          cardNewsCount: 0,
          notified: false,
          error: '발송할 카드뉴스가 없습니다',
        };
      }

      await this.notificationService.sendDailyNews(cardNews);
      return { cardNewsCount: cardNews.length, notified: true };
    } catch (error) {
      const message = describeError(error);
      this.logger.error(`발송 실패: ${message}`);
      return { cardNewsCount: 0, notified: false, error: message };
    }
  }

  /** 보관 기간이 지난 생성 이미지를 정리한다. 실패해도 파이프라인에 영향을 주지 않는다. */
  private async cleanupOldImages(): Promise<void> {
    const retentionDays = this.configService.get<number>(
      'IMAGE_RETENTION_DAYS',
      DEFAULT_IMAGE_RETENTION_DAYS,
    );
    const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    try {
      const files = await readdir(this.imagesDir);
      let removed = 0;

      for (const file of files) {
        const path = join(this.imagesDir, file);
        const info = await stat(path);
        if (info.isFile() && info.mtimeMs < threshold) {
          await unlink(path);
          removed++;
        }
      }

      if (removed > 0) {
        this.logger.log(`오래된 이미지 ${removed}건 정리 완료`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      this.logger.warn(`이미지 정리 실패: ${describeError(error)}`);
    }
  }
}
