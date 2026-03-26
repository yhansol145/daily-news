import { NewsEntity } from '../../../news/domain/entities/news.entity';

export interface CardNewsContent {
  headlineQuote: string;
  title: string;
  bullets: string[];
  imagePrompt: string;
}

export interface ClaudePort {
  generateCardNewsContent(news: NewsEntity): Promise<CardNewsContent>;
}

export const CLAUDE_PORT = Symbol('CLAUDE_PORT');
