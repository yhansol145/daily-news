import { CardNewsEntity } from '../entities/card-news.entity';

export interface CardNewsRepositoryPort {
  /** 해당 날짜의 카드뉴스를 저장한다. 같은 날짜가 있으면 덮어쓴다. */
  save(date: string, items: CardNewsEntity[]): Promise<void>;

  /** 해당 날짜의 카드뉴스를 조회한다. 없으면 null. */
  findByDate(date: string): Promise<CardNewsEntity[] | null>;
}

export const CARD_NEWS_REPOSITORY_PORT = Symbol('CARD_NEWS_REPOSITORY_PORT');
