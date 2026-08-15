import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KakaoNotificationAdapter } from './kakao-notification.adapter';
import { KakaoTokenProvider } from '../kakao-token.provider';
import { CardNewsEntity } from '../../../card-news/domain/entities/card-news.entity';

function makeCard(
  category: string,
  title: string,
  imageUrl = 'https://image.pollinations.ai/prompt/abc',
): CardNewsEntity {
  const entity = new CardNewsEntity();
  entity.headlineQuote = '핵심';
  entity.title = title;
  entity.bullets = ['포인트1', '포인트2'];
  entity.imageUrl = imageUrl;
  entity.sourceUrl = 'https://news.example.com/1';
  entity.category = category;
  entity.number = 1;
  entity.createdAt = new Date();
  return entity;
}

function successResponse(): unknown {
  return {
    ok: true,
    status: 200,
    json: async () => ({ result_code: 0 }),
    text: async () => '',
  };
}

function errorResponse(status: number): unknown {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => '오류',
  };
}

/** 발송에 사용된 template_object 들을 파싱해 돌려준다. */
function sentTemplates(fetchMock: jest.Mock): any[] {
  return fetchMock.mock.calls.map(([, init]) => {
    const body = init.body as URLSearchParams;
    return JSON.parse(body.get('template_object') as string);
  });
}

describe('KakaoNotificationAdapter', () => {
  let fetchMock: jest.Mock;
  let tokenProvider: KakaoTokenProvider;
  let adapter: KakaoNotificationAdapter;

  // 테스트에서는 발송 간격을 0 으로 두어 대기하지 않게 한다.
  const config = {
    get: (key: string, defaultValue?: unknown) =>
      key === 'KAKAO_SEND_INTERVAL_MS' ? 0 : defaultValue,
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    fetchMock = jest.fn().mockResolvedValue(successResponse());
    (global as any).fetch = fetchMock;

    tokenProvider = {
      getAccessToken: jest.fn(async () => 'access-token'),
      invalidate: jest.fn(),
    } as unknown as KakaoTokenProvider;

    adapter = new KakaoNotificationAdapter(tokenProvider, config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('카드뉴스가 없으면 아무것도 발송하지 않는다', async () => {
    await adapter.send([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('카드뉴스 1건당 feed 메시지 1건을 발송한다', async () => {
    await adapter.send([
      makeCard('경제', '경제1'),
      makeCard('경제', '경제2'),
      makeCard('사회', '사회1'),
    ]);

    const templates = sentTemplates(fetchMock);
    expect(templates).toHaveLength(3);
    expect(templates.every((t) => t.object_type === 'feed')).toBe(true);
  });

  it('제목에 카테고리를 붙이고 bullets 를 줄바꿈으로 잇는다', async () => {
    await adapter.send([makeCard('경제', '기준금리 동결')]);

    const [template] = sentTemplates(fetchMock);
    expect(template.content.title).toBe('[경제] 기준금리 동결');
    expect(template.content.description).toBe('포인트1\n포인트2');
  });

  it('원문 링크를 본문과 버튼에 모두 건다', async () => {
    await adapter.send([makeCard('경제', '경제1')]);

    const [template] = sentTemplates(fetchMock);
    expect(template.content.link.web_url).toBe('https://news.example.com/1');
    expect(template.buttons[0].link.web_url).toBe('https://news.example.com/1');
  });

  it('공개 이미지 주소는 템플릿에 포함한다', async () => {
    await adapter.send([
      makeCard('경제', '경제1', 'https://image.pollinations.ai/prompt/xyz'),
    ]);

    const [template] = sentTemplates(fetchMock);
    expect(template.content.image_url).toBe(
      'https://image.pollinations.ai/prompt/xyz',
    );
  });

  it('외부에서 접근 불가한 이미지 주소는 템플릿에서 제외한다', async () => {
    await adapter.send([
      makeCard('경제', '경제1', 'http://localhost:3000/images/a.jpg'),
    ]);

    const [template] = sentTemplates(fetchMock);
    expect(template.content.image_url).toBeUndefined();
  });

  it('401 응답이면 토큰을 무효화하고 한 번 재시도한다', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(401))
      .mockResolvedValueOnce(successResponse());

    await adapter.send([makeCard('경제', '단독')]);

    expect(tokenProvider.invalidate).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('일부 발송이 실패해도 나머지는 계속 발송한다', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(successResponse());

    await expect(
      adapter.send([makeCard('경제', '경제1'), makeCard('사회', '사회1')]),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('모든 발송이 실패하면 예외를 던진다', async () => {
    fetchMock.mockResolvedValue(errorResponse(500));

    await expect(adapter.send([makeCard('경제', '단독')])).rejects.toThrow(
      '한 건도 발송하지 못했습니다',
    );
  });

  it('result_code 가 0 이 아니면 실패로 처리한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result_code: -1 }),
      text: async () => '',
    });

    await expect(adapter.send([makeCard('경제', '단독')])).rejects.toThrow();
  });

  it('Authorization 헤더에 access token 을 담아 보낸다', async () => {
    await adapter.send([makeCard('경제', '단독')]);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer access-token');
  });
});
