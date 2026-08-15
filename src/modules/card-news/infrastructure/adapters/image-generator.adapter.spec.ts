import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HuggingFaceAdapter } from './huggingface.adapter';
import { PollinationsAdapter } from './pollinations.adapter';
import { ImageStorage } from '../image-storage';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeConfig(values: Record<string, unknown> = {}): ConfigService {
  return {
    get: (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
    getOrThrow: (key: string) => {
      const value = values[key] ?? 'test-token';
      return value;
    },
  } as unknown as ConfigService;
}

describe('이미지 생성 어댑터', () => {
  let fetchMock: jest.Mock;
  let storage: ImageStorage;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    storage = {
      save: jest.fn(async () => 'https://cdn.example.com/saved.png'),
    } as unknown as ImageStorage;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('HuggingFaceAdapter', () => {
    it('b64_json 응답을 디코딩해 저장한다', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: PNG_BYTES.toString('base64') }],
        }),
        text: async () => '',
      });

      const result = await new HuggingFaceAdapter(
        makeConfig(),
        storage,
      ).generate('a bank');

      expect(result).toBe('https://cdn.example.com/saved.png');
      expect(storage.save).toHaveBeenCalledWith(PNG_BYTES);
    });

    it('설정된 provider 와 model 로 요청한다', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: PNG_BYTES.toString('base64') }],
        }),
        text: async () => '',
      });

      const config = makeConfig({
        HF_IMAGE_PROVIDER: 'together',
        HF_IMAGE_MODEL: 'some/model',
      });
      await new HuggingFaceAdapter(config, storage).generate('a bank');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://router.huggingface.co/together/v1/images/generations',
      );
      expect(JSON.parse(init.body).model).toBe('some/model');
    });

    it('url 형태로 응답하면 내려받아 저장한다', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ url: 'https://img.example.com/a.png' }],
          }),
          text: async () => '',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          arrayBuffer: async () =>
            PNG_BYTES.buffer.slice(
              PNG_BYTES.byteOffset,
              PNG_BYTES.byteOffset + PNG_BYTES.byteLength,
            ),
        });

      await new HuggingFaceAdapter(makeConfig(), storage).generate('a bank');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(storage.save).toHaveBeenCalled();
    });

    it('이미지 데이터가 없으면 실패한다', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
        text: async () => '',
      });

      await expect(
        new HuggingFaceAdapter(makeConfig(), storage).generate('a bank'),
      ).rejects.toThrow('이미지 데이터가 없습니다');
    }, 15000);

    it('오류 응답이면 재시도 후 실패한다', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 410,
        text: async () => 'deprecated',
        json: async () => ({}),
      });

      await expect(
        new HuggingFaceAdapter(makeConfig(), storage).generate('a bank'),
      ).rejects.toThrow('HuggingFace API 오류: 410');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    }, 15000);
  });

  describe('PollinationsAdapter', () => {
    const imageResponse = () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        PNG_BYTES.buffer.slice(
          PNG_BYTES.byteOffset,
          PNG_BYTES.byteOffset + PNG_BYTES.byteLength,
        ),
    });

    it('프롬프트를 인코딩한 URL 로 요청한다', async () => {
      fetchMock.mockResolvedValue(imageResponse());

      await new PollinationsAdapter(makeConfig(), storage).generate(
        '한국 은행',
      );

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('https://image.pollinations.ai/prompt/');
      expect(url).toContain(encodeURIComponent('한국 은행'));
      expect(url).toContain('width=1024&height=1024');
    });

    it('기본값은 공개 URL 을 그대로 반환한다 (저장하지 않음)', async () => {
      fetchMock.mockResolvedValue(imageResponse());

      const result = await new PollinationsAdapter(
        makeConfig(),
        storage,
      ).generate('a bank');

      // 카카오가 직접 가져갈 수 있어야 하므로 로컬 저장 URL 이 아니어야 한다.
      expect(result).toContain('https://image.pollinations.ai/prompt/');
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('생성이 끝나도록 미리 한 번 요청해 캐시를 데운다', async () => {
      fetchMock.mockResolvedValue(imageResponse());

      await new PollinationsAdapter(makeConfig(), storage).generate('a bank');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('같은 프롬프트는 항상 같은 seed 를 쓴다', async () => {
      fetchMock.mockResolvedValue(imageResponse());
      const adapter = new PollinationsAdapter(makeConfig(), storage);

      const first = await adapter.generate('a bank');
      const second = await adapter.generate('a bank');
      const other = await adapter.generate('a cat');

      expect(first).toBe(second);
      expect(first).toMatch(/&seed=\d+$/);
      expect(other).not.toBe(first);
    });

    it('POLLINATIONS_DIRECT_URL=false 면 내려받아 저장한다', async () => {
      fetchMock.mockResolvedValue(imageResponse());

      const result = await new PollinationsAdapter(
        makeConfig({ POLLINATIONS_DIRECT_URL: 'false' }),
        storage,
      ).generate('a bank');

      expect(result).toBe('https://cdn.example.com/saved.png');
      expect(storage.save).toHaveBeenCalled();
    });

    it('오류 응답이면 재시도 후 실패한다', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      });

      await expect(
        new PollinationsAdapter(
          makeConfig({ POLLINATIONS_RETRY_DELAY_MS: 0 }),
          storage,
        ).generate('a bank'),
      ).rejects.toThrow('Pollinations API 오류: 502');
      // 기본 재시도 3회 → 최초 1회 + 재시도 3회
      expect(fetchMock).toHaveBeenCalledTimes(4);
    }, 15000);
  });
});
