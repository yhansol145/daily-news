import { isDateKey, todayKst } from './date';

describe('todayKst', () => {
  it('UTC 기준으로는 전날이어도 KST 기준 날짜를 반환한다', () => {
    // 2026-08-15T20:00:00Z === KST 2026-08-16 05:00
    expect(todayKst(new Date('2026-08-15T20:00:00Z'))).toBe('2026-08-16');
  });

  it('KST 자정 직전은 같은 날로 계산한다', () => {
    // 2026-08-15T14:59:00Z === KST 2026-08-15 23:59
    expect(todayKst(new Date('2026-08-15T14:59:00Z'))).toBe('2026-08-15');
  });

  it('KST 자정 직후는 다음 날로 계산한다', () => {
    // 2026-08-15T15:00:00Z === KST 2026-08-16 00:00
    expect(todayKst(new Date('2026-08-15T15:00:00Z'))).toBe('2026-08-16');
  });
});

describe('isDateKey', () => {
  it('YYYY-MM-DD 형식을 허용한다', () => {
    expect(isDateKey('2026-08-15')).toBe(true);
  });

  it.each(['2026-8-15', '20260815', '../../etc/passwd', ''])(
    '%s 는 허용하지 않는다',
    (value) => {
      expect(isDateKey(value)).toBe(false);
    },
  );
});
