import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { EditorialLean, NewsArticle, NewsFeedResponse, NewsSource, PerspectiveMatch } from '../shared/news-types';

export const newsSources: NewsSource[] = [
  { id: 'bbc-world', name: 'BBC News', category: 'World', lean: 'center', website: 'https://www.bbc.com/news' },
  { id: 'npr-news', name: 'NPR', category: 'U.S.', lean: 'center-left', website: 'https://www.npr.org' },
  { id: 'guardian-world', name: 'The Guardian', category: 'World', lean: 'left', website: 'https://www.theguardian.com/world' },
  { id: 'fox-news', name: 'Fox News', category: 'U.S.', lean: 'right', website: 'https://www.foxnews.com' },
  { id: 'pbs-news', name: 'PBS NewsHour', category: 'U.S.', lean: 'center-left', website: 'https://www.pbs.org/newshour' },
  { id: 'al-jazeera', name: 'Al Jazeera', category: 'World', lean: 'center', website: 'https://www.aljazeera.com' },
  { id: 'dw-news', name: 'DW', category: 'World', lean: 'center', website: 'https://www.dw.com' },
  { id: 'cnbc-business', name: 'CNBC', category: 'Business', lean: 'center', website: 'https://www.cnbc.com' },
  { id: 'the-verge-tech', name: 'The Verge', category: 'Technology', lean: 'center-left', website: 'https://www.theverge.com' },
  { id: 'techcrunch', name: 'TechCrunch', category: 'Technology', lean: 'center', website: 'https://techcrunch.com' },
  { id: 'ars-technica', name: 'Ars Technica', category: 'Technology', lean: 'center', website: 'https://arstechnica.com' },
  { id: 'mit-tech-review', name: 'MIT Technology Review', category: 'Technology', lean: 'center', website: 'https://www.technologyreview.com' },
  { id: 'fox-tech', name: 'Fox News Technology', category: 'Technology', lean: 'right', website: 'https://www.foxnews.com/tech' },
  { id: 'cnn-us', name: 'CNN', category: 'U.S.', lean: 'center-left', website: 'https://www.cnn.com' },
  { id: 'cbs-us', name: 'CBS News', category: 'U.S.', lean: 'center', website: 'https://www.cbsnews.com' },
  { id: 'abc-us', name: 'ABC News', category: 'U.S.', lean: 'center', website: 'https://abcnews.go.com' },
  { id: 'nyt-world', name: 'The New York Times', category: 'World', lean: 'center-left', website: 'https://www.nytimes.com/section/world' },
  { id: 'wsj-world', name: 'The Wall Street Journal', category: 'World', lean: 'center-right', website: 'https://www.wsj.com/news/world' },
  { id: 'politico-us', name: 'POLITICO', category: 'U.S.', lean: 'center', website: 'https://www.politico.com' },
  { id: 'thehill-us', name: 'The Hill', category: 'U.S.', lean: 'center', website: 'https://thehill.com' },
  { id: 'france24-world', name: 'France 24', category: 'World', lean: 'center', website: 'https://www.france24.com/en' },
  { id: 'cbc-world', name: 'CBC News', category: 'World', lean: 'center-left', website: 'https://www.cbc.ca/news/world' },
  { id: 'sky-world', name: 'Sky News', category: 'World', lean: 'center', website: 'https://news.sky.com/world' },
];

const feeds: Record<string, string> = {
  'bbc-world': 'https://feeds.bbci.co.uk/news/world/rss.xml',
  'npr-news': 'https://feeds.npr.org/1001/rss.xml',
  'guardian-world': 'https://www.theguardian.com/world/rss',
  'fox-news': 'https://moxie.foxnews.com/google-publisher/latest.xml',
  'pbs-news': 'https://www.pbs.org/newshour/feeds/rss/headlines',
  'al-jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
  'dw-news': 'https://rss.dw.com/rdf/rss-en-all',
  'cnbc-business': 'https://www.cnbc.com/id/10001147/device/rss/rss.html',
  'the-verge-tech': 'https://www.theverge.com/rss/index.xml',
  techcrunch: 'https://techcrunch.com/feed/',
  'ars-technica': 'https://feeds.arstechnica.com/arstechnica/index',
  'mit-tech-review': 'https://www.technologyreview.com/feed/',
  'fox-tech': 'https://moxie.foxnews.com/google-publisher/tech.xml',
  'cnn-us': 'https://rss.cnn.com/rss/edition.rss',
  'cbs-us': 'https://www.cbsnews.com/latest/rss/main',
  'abc-us': 'https://abcnews.go.com/abcnews/topstories',
  'nyt-world': 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  'wsj-world': 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
  'politico-us': 'https://rss.politico.com/politics-news.xml',
  'thehill-us': 'https://thehill.com/feed/',
  'france24-world': 'https://www.france24.com/en/rss',
  'cbc-world': 'https://www.cbc.ca/webfeed/rss/rss-world',
  'sky-world': 'https://feeds.skynews.com/feeds/rss/world.xml',
};

const leanSchema = z.enum(['left', 'center-left', 'center', 'center-right', 'right']).optional();
const querySchema = z.object({
  category: z.string().trim().max(40).optional(),
  lean: leanSchema,
  search: z.string().trim().max(100).optional(),
});

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
      const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
      const numeric = code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(numeric) && numeric >= 0 && numeric <= 0x10ffff ? String.fromCodePoint(numeric) : '';
    });
}

function elementText(xml: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<(?:(?:\\w+):)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:\\w+):)?${escaped}\\s*>`, 'i').exec(xml);
  return match?.[1] ?? '';
}

function cleanText(value: string): string {
  return decodeXml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(decodeXml(value.trim()));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeImageUrl(value: string, base: string): string | null {
  try {
    const url = new URL(decodeXml(value.trim()), base);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageFromEntry(xml: string, source: NewsSource): string | null {
  const candidates = [
    /<(?:media:)?thumbnail\b[^>]*\burl=["']([^"']+)["']/i,
    /<media:content\b[^>]*\burl=["']([^"']+)["']/i,
    /<enclosure\b(?=[^>]*\btype=["']image\/)[^>]*\burl=["']([^"']+)["']/i,
    /<img\b[^>]*\bsrc=["']([^"']+)["']/i,
  ];
  for (const pattern of candidates) {
    const value = pattern.exec(xml)?.[1];
    if (value) {
      const url = safeImageUrl(value, source.website);
      if (url) return url;
    }
  }
  return null;
}

function parseEntry(xml: string, source: NewsSource): NewsArticle | null {
  const title = cleanText(elementText(xml, 'title'));
  const linkValue = elementText(xml, 'link') || /<link\b[^>]*href=["']([^"']+)["']/i.exec(xml)?.[1] || '';
  const url = safeUrl(linkValue);
  if (!title || !url) return null;

  const summary = cleanText(
    elementText(xml, 'description') || elementText(xml, 'summary') || elementText(xml, 'content:encoded') || elementText(xml, 'content'),
  ).slice(0, 500);
  const dateValue = elementText(xml, 'pubDate') || elementText(xml, 'published') || elementText(xml, 'updated');
  const parsedDate = Date.parse(cleanText(dateValue));

  return {
    id: createHash('sha256').update(`${source.id}:${url}`).digest('hex').slice(0, 20),
    title,
    summary,
    url,
    publishedAt: Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : new Date(0).toISOString(),
    source,
    imageUrl: imageFromEntry(xml, source),
  };
}

const headlineStopWords = new Set([
  'about', 'after', 'amid', 'among', 'around', 'before', 'being', 'between', 'could', 'from', 'have', 'into', 'more', 'over',
  'says', 'said', 'that', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'what', 'when', 'where',
  'which', 'while', 'with', 'will', 'would', 'your', 'latest', 'live', 'news', 'report', 'reports', 'video', 'update', 'updates',
]);

function headlineTerms(title: string): Set<string> {
  return new Set(
    title
      .toLocaleLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2 && !headlineStopWords.has(term)),
  );
}

function opposingLeans(lean: EditorialLean): EditorialLean[] {
  switch (lean) {
    case 'left':
      return ['center-right', 'right'];
    case 'center-left':
      return ['right'];
    case 'center':
      return ['left', 'right'];
    case 'center-right':
      return ['left'];
    case 'right':
      return ['left', 'center-left'];
  }
}

function findPerspectiveMatches(article: NewsArticle, articles: NewsArticle[]): PerspectiveMatch[] {
  const terms = headlineTerms(article.title);
  if (terms.size < 2) return [];

  const opposing = new Set(opposingLeans(article.source.lean));
  return articles
    .filter((candidate) => {
      if (candidate.id === article.id || candidate.source.category !== article.source.category || !opposing.has(candidate.source.lean)) return false;
      return Math.abs(Date.parse(candidate.publishedAt) - Date.parse(article.publishedAt)) <= 72 * 60 * 60 * 1000;
    })
    .map((candidate) => {
      const candidateTerms = headlineTerms(candidate.title);
      const sharedTerms = [...terms].filter((term) => candidateTerms.has(term)).length;
      const score = sharedTerms / Math.min(terms.size, candidateTerms.size || 1);
      return { candidate, sharedTerms, score };
    })
    .filter(({ sharedTerms, score }) => sharedTerms >= 2 && score >= 0.4)
    .sort((a, b) => b.score - a.score || Date.parse(b.candidate.publishedAt) - Date.parse(a.candidate.publishedAt))
    .slice(0, 2)
    .map(({ candidate }): PerspectiveMatch => ({
      id: candidate.id,
      title: candidate.title,
      url: candidate.url,
      publishedAt: candidate.publishedAt,
      source: candidate.source,
    }));
}

export function parseRss(xml: string, source: NewsSource): NewsArticle[] {
  const entries = xml.match(/<(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:item|entry)\s*>/gi) ?? [];
  const seen = new Set<string>();
  return entries
    .map((entry) => parseEntry(entry, source))
    .filter((article): article is NewsArticle => {
      if (!article || seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });
}

type Fetcher = typeof fetch;

export class NewsService {
  private cache: { expiresAt: number; articles: NewsArticle[]; sources: NewsFeedResponse['sources'] } | null = null;

  constructor(private readonly fetcher: Fetcher = fetch) {}

  async list(filters: z.infer<typeof querySchema> = {}): Promise<NewsFeedResponse> {
    const now = Date.now();
    if (!this.cache || this.cache.expiresAt <= now) await this.refresh(now);
    const normalizedSearch = filters.search?.toLocaleLowerCase();
    const articles = this.cache!.articles.filter((article) => {
      if (filters.category && article.source.category.toLowerCase() !== filters.category.toLowerCase()) return false;
      if (filters.lean && article.source.lean !== filters.lean) return false;
      if (normalizedSearch && !`${article.title} ${article.summary} ${article.source.name}`.toLocaleLowerCase().includes(normalizedSearch)) return false;
      return true;
    });
    return {
      articles,
      total: articles.length,
      categories: [...new Set(newsSources.map((source) => source.category))].sort(),
      perspectiveCounts: editorialLeans.map((lean) => ({
        lean,
        articleCount: this.cache!.articles.filter((article) => article.source.lean === lean).length,
      })),
      sources: this.cache!.sources,
      updatedAt: new Date(now).toISOString(),
    };
  }

  private async refresh(now: number): Promise<void> {
    const results = await Promise.all(
      newsSources.map(async (source) => {
        try {
          const response = await this.fetcher(feeds[source.id], {
            headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error(`Feed returned ${response.status}`);
          const articles = parseRss(await response.text(), source);
          return { source, articles, available: true };
        } catch {
          return { source, articles: [] as NewsArticle[], available: false };
        }
      }),
    );
    const articles = results
      .flatMap((result) => result.articles)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const articlesWithPerspectives = articles.map((article) => ({
      ...article,
      perspectives: findPerspectiveMatches(article, articles),
    }));
    this.cache = {
      expiresAt: now + 3 * 60 * 1000,
      articles: articlesWithPerspectives,
      sources: results.map(({ source, articles: sourceArticles, available }) => ({ ...source, available, articleCount: sourceArticles.length })),
    };
  }
}

export function newsRouter(service = new NewsService()): Router {
  const router = Router();
  router.get('/', async (req, res) => {
    const filters = querySchema.parse({ category: req.query.category, lean: req.query.lean, search: req.query.search });
    res.json(await service.list(filters));
  });
  return router;
}

export const editorialLeans: EditorialLean[] = ['left', 'center-left', 'center', 'center-right', 'right'];