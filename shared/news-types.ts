export type EditorialLean = 'left' | 'center-left' | 'center' | 'center-right' | 'right';

export interface NewsSource {
  id: string;
  name: string;
  category: string;
  lean: EditorialLean;
  website: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: NewsSource;
  imageUrl?: string | null;
  perspectives?: PerspectiveMatch[];
}

export interface PerspectiveCount {
  lean: EditorialLean;
  articleCount: number;
}

export interface PerspectiveMatch {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  source: NewsSource;
}

export interface NewsFeedResponse {
  articles: NewsArticle[];
  total: number;
  categories: string[];
  perspectiveCounts: PerspectiveCount[];
  sources: (NewsSource & { available: boolean; articleCount: number })[];
  updatedAt: string;
}