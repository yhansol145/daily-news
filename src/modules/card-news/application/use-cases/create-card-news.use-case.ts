import { Injectable } from '@nestjs/common';
import { NewsEntity } from '../../../news/domain/entities/news.entity';
import { CardNewsEntity } from '../../domain/entities/card-news.entity';

@Injectable()
export class CreateCardNewsUseCase {
  async execute(newsItems: NewsEntity[]): Promise<CardNewsEntity[]> {
    throw new Error('Not implemented');
  }
}
