import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardNewsEntity } from '../../../card-news/domain/entities/card-news.entity';
import { NotificationPort } from '../../domain/ports/notification.port';
import { KakaoTokenProvider } from '../kakao-token.provider';
import { isPubliclyReachable } from '../../../../common/config/base-url';
import { sleep } from '../../../../common/utils/retry';
import { describeError } from '../../../../common/utils/error';

const SEND_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

/** 연속 발송 시 사이 간격 기본값 */
const DEFAULT_SEND_INTERVAL_MS = 300;

interface KakaoLink {
  web_url: string;
  mobile_web_url: string;
}

interface KakaoSendResult {
  result_code?: number;
}

/**
 * 카카오톡 '나에게 보내기'(메모) API 로 카드뉴스를 발송한다.
 * 카드뉴스 1건당 feed 템플릿 메시지 1건을 보낸다.
 */
@Injectable()
export class KakaoNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger(KakaoNotificationAdapter.name);
  private warnedAboutLocalImages = false;

  constructor(
    private readonly tokenProvider: KakaoTokenProvider,
    private readonly configService: ConfigService,
  ) {}

  async send(cardNewsItems: CardNewsEntity[]): Promise<void> {
    if (cardNewsItems.length === 0) {
      this.logger.warn('발송할 카드뉴스가 없어 전송을 건너뜁니다');
      return;
    }

    const templates = cardNewsItems.map((card) => this.buildFeedTemplate(card));
    const interval = this.configService.get<number>(
      'KAKAO_SEND_INTERVAL_MS',
      DEFAULT_SEND_INTERVAL_MS,
    );
    let sent = 0;

    for (const [index, template] of templates.entries()) {
      try {
        await this.sendTemplate(template);
        sent++;
      } catch (error) {
        // 한 건이 실패해도 나머지는 계속 보낸다.
        this.logger.error(
          `카카오 메시지 발송 실패 (${index + 1}/${templates.length}): ${describeError(error)}`,
        );
      }

      if (index < templates.length - 1 && interval > 0) {
        await sleep(interval);
      }
    }

    this.logger.log(`카카오 메시지 ${sent}/${templates.length}건 발송 완료`);

    if (sent === 0) {
      throw new Error('카카오 메시지를 한 건도 발송하지 못했습니다');
    }
  }

  private async sendTemplate(template: unknown): Promise<void> {
    const post = async (): Promise<Response> => {
      const accessToken = await this.tokenProvider.getAccessToken();
      return fetch(SEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: new URLSearchParams({
          template_object: JSON.stringify(template),
        }),
      });
    };

    let response = await post();

    // 캐시된 토큰이 만료된 경우 한 번만 재발급 후 재시도한다.
    if (response.status === 401) {
      this.logger.warn('access token 만료로 재발급 후 재시도합니다');
      this.tokenProvider.invalidate();
      response = await post();
    }

    if (!response.ok) {
      throw new Error(
        `카카오 API 오류: ${response.status} ${await response.text()}`,
      );
    }

    const result = (await response.json()) as KakaoSendResult;
    if (result.result_code !== 0) {
      throw new Error(`카카오 API 응답 코드 이상: ${JSON.stringify(result)}`);
    }
  }

  private buildFeedTemplate(card: CardNewsEntity): unknown {
    return {
      object_type: 'feed',
      content: {
        title: truncate(`[${card.category}] ${card.title}`, 100),
        description: truncate(card.bullets.join('\n'), 180),
        ...this.imageField(card),
        link: this.toLink(card.sourceUrl),
      },
      buttons: [
        {
          title: '뉴스 원문 보기',
          link: this.toLink(card.sourceUrl),
        },
      ],
    };
  }

  /**
   * 카카오 서버가 이미지 URL 을 직접 가져가므로 localhost 주소는 넣을 수 없다.
   * 공개 주소가 아니면 이미지 없이 발송한다.
   */
  private imageField(card: CardNewsEntity): { image_url?: string } {
    if (card.imageUrl && isPubliclyReachable(card.imageUrl)) {
      return { image_url: card.imageUrl };
    }

    if (!this.warnedAboutLocalImages) {
      this.logger.warn(
        '이미지 URL 이 외부에서 접근 불가한 주소라 이미지 없이 발송합니다. ' +
          'IMAGE_PROVIDER=pollinations 를 쓰거나 BASE_URL 을 공개 도메인으로 설정하세요.',
      );
      this.warnedAboutLocalImages = true;
    }
    return {};
  }

  private toLink(url: string): KakaoLink {
    return { web_url: url, mobile_web_url: url };
  }
}

function truncate(text: string, max: number): string {
  // bullets 는 줄바꿈으로 이어 붙이므로 개행은 남기고 공백만 정리한다.
  const normalized = text.replace(/[^\S\n]+/g, ' ').trim();
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1)}…`;
}
