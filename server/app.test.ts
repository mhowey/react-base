import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { config } from './config';
import { openDatabase, type DB } from './db';

let db: DB;
let app: ReturnType<typeof createApp>['app'];

async function login(email: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/dev-login').send({ email });
  expect(res.status).toBe(200);
  return agent;
}

beforeEach(() => {
  db = openDatabase(':memory:');
  app = createApp(db, { ...config, devLogin: true }).app;
});

describe('auth', () => {
  it('first user becomes admin, later users do not', async () => {
    const a = await login('admin@example.com');
    const b = await login('user@example.com');
    expect((await a.get('/api/auth/me')).body.user.role).toBe('admin');
    expect((await b.get('/api/auth/me')).body.user.role).toBe('user');
    expect((await b.get('/api/schema/tables')).status).toBe(403);
    expect((await request(app).get('/api/schema/tables')).status).toBe(401);
  });
});

describe('schema builder + data API', () => {
  it('creates tables, fields, relations and validates data', async () => {
    const admin = await login('admin@example.com');

    const authors = await admin.post('/api/schema/tables').send({
      name: 'authors',
      readAccess: 'public',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', unique: true },
      ],
    });
    expect(authors.status).toBe(201);
    expect(authors.body.displayField).toBe('name');

    const posts = await admin.post('/api/schema/tables').send({
      name: 'posts',
      writeAccess: 'owner',
      fields: [
        { name: 'title', type: 'text', required: true, options: { max: 120 } },
        { name: 'status', type: 'select', options: { choices: ['draft', 'published'] }, defaultValue: 'draft' },
        { name: 'published', type: 'boolean' },
        { name: 'meta', type: 'json' },
        { name: 'author', type: 'relation', options: { relationTable: 'authors' } },
      ],
    });
    expect(posts.status).toBe(201);

    const author = await admin.post('/api/data/authors').send({ name: 'Ada', email: 'ada@example.com' });
    expect(author.status).toBe(201);
    expect((await admin.post('/api/data/authors').send({ name: 'Dup', email: 'ada@example.com' })).status).toBe(409);
    expect((await admin.post('/api/data/authors').send({ email: 'x@example.com' })).status).toBe(400);

    const post = await admin
      .post('/api/data/posts')
      .send({ title: 'Hello', published: true, meta: { tags: ['a'] }, author: author.body.id });
    expect(post.status).toBe(201);
    expect(post.body).toMatchObject({ title: 'Hello', status: 'draft', published: true, meta: { tags: ['a'] } });
    expect((await admin.post('/api/data/posts').send({ title: 'x', status: 'nope' })).status).toBe(400);
    expect((await admin.post('/api/data/posts').send({ title: 'x', bogus: 1 })).status).toBe(400);

    // public read without auth
    const list = await request(app).get('/api/data/authors?search=ad');
    expect(list.body.total).toBe(1);
    // non-public table requires auth
    expect((await request(app).get('/api/data/posts')).status).toBe(401);

    // owner write access: another user can create but not edit admin's post
    const user = await login('user@example.com');
    expect((await user.post('/api/data/posts').send({ title: 'Mine' })).status).toBe(201);
    expect((await user.patch(`/api/data/posts/${post.body.id}`).send({ title: 'Hacked' })).status).toBe(403);
    expect((await user.get('/api/data/posts?filter[status]=draft')).body.total).toBe(2);

    // add, rename, retype and drop fields with existing data
    expect((await admin.post('/api/schema/tables/posts/fields').send({ name: 'views', type: 'integer' })).status).toBe(201);
    await admin.patch(`/api/data/posts/${post.body.id}`).send({ views: 42 });
    expect((await admin.patch('/api/schema/tables/posts/fields/views').send({ name: 'view_count', type: 'number' })).status).toBe(200);
    expect((await admin.get(`/api/data/posts/${post.body.id}`)).body.view_count).toBe(42);
    expect((await admin.delete('/api/schema/tables/posts/fields/author')).status).toBe(200);
    expect((await admin.get(`/api/data/posts/${post.body.id}`)).body.title).toBe('Hello');

    // cannot drop a referenced table
    await admin.post('/api/schema/tables/posts/fields').send({ name: 'writer', type: 'relation', options: { relationTable: 'authors' } });
    expect((await admin.delete('/api/schema/tables/authors')).status).toBe(409);

    // export → import into a fresh database round-trips
    const exported = (await admin.get('/api/schema/export')).body;
    const db2 = openDatabase(':memory:');
    const app2 = createApp(db2, { ...config, devLogin: true }).app;
    const admin2 = request.agent(app2);
    await admin2.post('/api/auth/dev-login').send({ email: 'a@b.co' });
    const imported = await admin2.post('/api/schema/import').send(exported);
    expect(imported.body.createdTables.sort()).toEqual(['authors', 'posts']);
    const types = await admin2.get('/api/schema/types.ts');
    expect(types.text).toContain('export interface Posts');
    expect(types.text).toContain('status: "draft" | "published" | null;');
  });

  it('rejects reserved and invalid identifiers', async () => {
    const admin = await login('admin@example.com');
    expect((await admin.post('/api/schema/tables').send({ name: 'users' })).status).toBe(400);
    expect((await admin.post('/api/schema/tables').send({ name: 'Bad Name' })).status).toBe(400);
    expect((await admin.post('/api/schema/tables').send({ name: 't', fields: [{ name: 'id', type: 'text' }] })).status).toBe(400);
  });
});

describe('SEO / AIO endpoints', () => {
  it('serves robots, sitemap and llms.txt', async () => {
    const robots = await request(app).get('/robots.txt');
    expect(robots.text).toContain('User-agent: GPTBot');
    expect(robots.text).toContain('Sitemap:');
    const sitemap = await request(app).get('/sitemap.xml');
    expect(sitemap.text).toContain('<loc>');
    expect(sitemap.text).not.toContain('/dashboard');
    const llms = await request(app).get('/llms.txt');
    expect(llms.text).toMatch(/^# /);
    expect((await request(app).get('/llms-full.txt')).text).toContain('FAQ');
  });
});
