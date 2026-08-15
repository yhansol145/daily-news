export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 지수 백오프로 재시도한다. 마지막 시도까지 실패하면 마지막 에러를 그대로 던진다.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 2, delayMs = 500, onRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      onRetry?.(error, attempt + 1);
      await sleep(delayMs * 2 ** attempt);
    }
  }

  throw lastError;
}

/**
 * 동시 실행 수를 제한하면서 매핑한다. 개별 실패가 전체를 중단시키지 않도록
 * Promise.allSettled 와 동일한 형태로 결과를 돌려준다.
 */
export async function mapSettledWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  const workerCount = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (let index = cursor++; index < items.length; index = cursor++) {
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fn(items[index], index),
        };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
