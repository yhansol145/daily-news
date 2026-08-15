const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 오늘 날짜를 `YYYY-MM-DD` 로 반환한다. */
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` 형식인지 검사한다. (파일명으로 쓰이므로 경로 조작 방지 목적) */
export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
