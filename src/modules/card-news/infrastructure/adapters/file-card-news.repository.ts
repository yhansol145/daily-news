import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';
import { CardNewsRepositoryPort } from '../../domain/ports/card-news-repository.port';
import { isDateKey } from '../../../../common/utils/date';

/**
 * 날짜별 JSON 파일로 카드뉴스를 보관한다.
 * DB 도입 전까지 쓰는 최소 구현이며, 재시작해도 당일 결과가 유지된다.
 */
@Injectable()
export class FileCardNewsRepository implements CardNewsRepositoryPort {
  private readonly logger = new Logger(FileCardNewsRepository.name);
  private readonly dataDir = join(process.cwd(), 'data', 'card-news');

  async save(date: string, items: CardNewsEntity[]): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(
      this.filePath(date),
      JSON.stringify(items, null, 2),
      'utf-8',
    );
    this.logger.log(`${date} 카드뉴스 ${items.length}건 저장`);
  }

  async findByDate(date: string): Promise<CardNewsEntity[] | null> {
    try {
      const raw = await readFile(this.filePath(date), 'utf-8');
      const parsed = JSON.parse(raw) as CardNewsEntity[];
      return parsed.map((item) => this.toEntity(item));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private filePath(date: string): string {
    if (!isDateKey(date)) {
      throw new Error(`잘못된 날짜 형식입니다: ${date}`);
    }
    return join(this.dataDir, `${date}.json`);
  }

  /** JSON 으로 직렬화되며 문자열이 된 createdAt 을 Date 로 복원한다. */
  private toEntity(raw: CardNewsEntity): CardNewsEntity {
    const entity = new CardNewsEntity();
    Object.assign(entity, raw);
    entity.createdAt = new Date(raw.createdAt);
    return entity;
  }
}
