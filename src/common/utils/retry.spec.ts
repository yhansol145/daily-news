import { mapSettledWithConcurrency, retry, sleep } from './retry';

describe('retry', () => {
  it('첫 시도에 성공하면 재시도하지 않는다', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    await expect(retry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('실패 후 성공하면 그 결과를 반환한다', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('일시 오류'))
      .mockResolvedValue('ok');

    await expect(retry(fn, { retries: 2, delayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('모두 실패하면 마지막 에러를 던진다', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('계속 실패'));

    await expect(retry(fn, { retries: 2, delayMs: 1 })).rejects.toThrow(
      '계속 실패',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('재시도할 때마다 onRetry 를 호출한다', async () => {
    const onRetry = jest.fn();
    const fn = jest.fn().mockRejectedValue(new Error('실패'));

    await expect(
      retry(fn, { retries: 2, delayMs: 1, onRetry }),
    ).rejects.toThrow();
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});

describe('mapSettledWithConcurrency', () => {
  it('동시 실행 수가 제한을 넘지 않는다', async () => {
    let active = 0;
    let peak = 0;

    await mapSettledWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (item) => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
      return item;
    });

    expect(peak).toBe(2);
  });

  it('개별 실패가 나머지 작업을 중단시키지 않는다', async () => {
    const results = await mapSettledWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('실패');
      return n;
    });

    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
    ]);
  });

  it('완료 순서와 무관하게 입력 순서로 결과를 반환한다', async () => {
    const results = await mapSettledWithConcurrency(
      [30, 10, 20],
      3,
      async (ms) => {
        await sleep(ms);
        return ms;
      },
    );

    const values = results.map((result) =>
      result.status === 'fulfilled' ? result.value : null,
    );
    expect(values).toEqual([30, 10, 20]);
  });

  it('빈 배열이면 아무것도 실행하지 않는다', async () => {
    const fn = jest.fn();

    await expect(mapSettledWithConcurrency([], 3, fn)).resolves.toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});
