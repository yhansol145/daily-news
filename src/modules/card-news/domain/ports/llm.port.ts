import { NewsEntity } from '../../../news/domain/entities/news.entity';

export interface CardNewsContent {
  headlineQuote: string;
  title: string;
  bullets: string[];
  imagePrompt: string;
}

export interface LlmPort {
  generateCardNewsContent(news: NewsEntity): Promise<CardNewsContent>;
}

export const LLM_PORT = Symbol('LLM_PORT');
