import { detectExtension } from './image-storage';

describe('detectExtension', () => {
  it('PNG 시그니처를 인식한다', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectExtension(png)).toBe('png');
  });

  it('JPEG 시그니처를 인식한다', () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectExtension(jpg)).toBe('jpg');
  });

  it('WEBP 시그니처를 인식한다', () => {
    const webp = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WEBP', 'ascii'),
    ]);
    expect(detectExtension(webp)).toBe('webp');
  });

  it('알 수 없는 형식은 jpg 로 처리한다', () => {
    expect(detectExtension(Buffer.from([0x00, 0x01, 0x02]))).toBe('jpg');
  });

  it('너무 짧은 버퍼에서도 예외를 던지지 않는다', () => {
    expect(detectExtension(Buffer.alloc(0))).toBe('jpg');
  });
});
