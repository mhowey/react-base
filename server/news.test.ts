import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { NewsSource } from '../shared/news-types';
import appSchema from '../schema/app-schema.json';
import { config } from './config';
import { createApp } from './app';
import { openDatabase } from './db';
import { NewsService, parseRss } from './news';

const sampleSource: NewsSource = {
  id: 'test-source',
  name: 'Test News',
  category: 'World',
  lean: 'center',
  website: 'https://example.com',
};

const rss = `<?xml version="1.0"?><rss><channel><item>
  <title>Global &amp; local news</title>
  <link>https://example.com/story</link>
  <media:thumbnail url="https://images.example.com/story.jpg" />
  <description><![CDATA[<p>A <b>short</b> summary &amp; details.</p>]]></description>
  <pubDate>Fri, 06 Nov 2026 10:00:00 GMT</pubDate>
</item><item><title>Unsafe link</title><link>javascript:alert(1)</link></item></channel></rss>`;
const comparisonHeadline = "City council approves clean energy plan after public vote";
const feedFor = (url: string, title = comparisonHeadline) =>
  rss.replace("https://example.com/story", url).replace("Global &amp; local news", title);
const testFetcher: typeof fetch = async (input) => {
  const feedUrl = String(input);
  if (feedUrl.includes("feeds.npr.org")) return new Response(feedFor("https://npr.example/story"), { status: 200 });
  if (feedUrl.includes("moxie.foxnews.com/google-publisher/latest.xml")) return new Response(feedFor("https://fox.example/story"), { status: 200 });
  return new Response("<rss><channel></channel></rss>", { status: 200 });
};

const databases: ReturnType<typeof openDatabase>[] = [];
afterEach(() => {
  databases.splice(0).forEach((db) => db.close());
  vi.restoreAllMocks();
});

describe('news aggregation', () => {
  it('parses RSS text, cleans markup, and ignores unsafe article links', () => {
    const articles = parseRss(rss, sampleSource);
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      title: 'Global & local news',
      summary: 'A short summary & details.',
      url: 'https://example.com/story',
      imageUrl: 'https://images.example.com/story.jpg',
      source: sampleSource,
    });
  });

  it('aggregates feeds and filters by perspective and search', async () => {
    const service = new NewsService(testFetcher);
    const result = await service.list({ lean: 'right', search: 'fox' });
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].source.id).toBe('fox-news');
    expect(result.articles[0].perspectives?.map((article) => article.source.id)).toContain('npr-news');
    expect(result.sources).toHaveLength(23);
    expect(result.categories).toContain('Technology');
    expect(result.perspectiveCounts.reduce((sum, item) => sum + item.articleCount, 0)).toBeGreaterThanOrEqual(2);
    expect(result.sources.every((source) => source.available)).toBe(true);
  });

  it('serves the public endpoint and validates filter values', async () => {
    const db = openDatabase(':memory:');
    databases.push(db);
    const app = createApp(db, { ...config, isTest: true, devLogin: false }, { fetcher: testFetcher }).app;

    const response = await request(app).get('/api/news?lean=right');
    expect(response.status).toBe(200);
    expect(response.body.articles).toHaveLength(1);
    expect(response.body.articles[0].source.lean).toBe('right');
    expect((await request(app).get('/api/news?lean=extreme')).status).toBe(400);
  });

  it('persists favorites privately and validates every source ID', async () => {
    const db = openDatabase(':memory:');
    databases.push(db);
    const { app, schema } = createApp(db, { ...config, isTest: true, devLogin: true }, { fetcher: testFetcher });
    schema.importSchema(appSchema as unknown as Parameters<typeof schema.importSchema>[0]);

    expect((await request(app).get('/api/news/preferences/favorites')).status).toBe(401);
    const alice = request.agent(app);
    await alice.post('/api/auth/dev-login').send({ email: 'alice@example.com' });
    expect((await alice.get('/api/news/preferences/favorites')).body.favoriteSourceIds).toEqual([]);
    const saved = await alice.put('/api/news/preferences/favorites').send({ favoriteSourceIds: ['fox-news', 'npr-news'] });
    expect(saved.status).toBe(200);
    expect(saved.body.favoriteSourceIds).toEqual(['fox-news', 'npr-news']);
    expect((await alice.get('/api/news/preferences/favorites')).body.favoriteSourceIds).toEqual(['fox-news', 'npr-news']);
    expect((await alice.put('/api/news/preferences/favorites').send({ favoriteSourceIds: ['unknown-source'] })).status).toBe(400);

    const bob = request.agent(app);
    await bob.post('/api/auth/dev-login').send({ email: 'bob@example.com' });
    expect((await bob.get('/api/news/preferences/favorites')).body.favoriteSourceIds).toEqual([]);
    expect((await bob.get('/api/data/news_preferences')).status).toBe(403);
  });
});