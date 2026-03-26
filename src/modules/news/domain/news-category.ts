export const NEWS_CATEGORIES = ['경제', '사회', '생활문화'] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
