import { Router } from 'express';
import { seoRoutes, siteConfig, type SeoRoute } from '../../shared/seo.config';
import { absoluteUrl, buildHead, escapeHtml, indexableRoutes, safeJson } from '../../shared/seo';

/**
 * Extension point for dynamic, indexable content (blog posts, products, …).
 * Register a source that returns routes; they are included in the sitemap,
 * llms.txt and server-rendered head tags.
 *
 *   registerSeoSource(() => db.prepare('SELECT slug, title FROM posts').all()
 *     .map(p => ({ path: `/blog/${p.slug}`, title: p.title, description: '…', schemaType: 'Article' })));
 */
type SeoSource = () => SeoRoute[];
const sources: SeoSource[] = [];
export const registerSeoSource = (s: SeoSource) => void sources.push(s);

const dynamicRoutes = () => sources.flatMap((s) => s());
const allIndexable = () => [...indexableRoutes(), ...dynamicRoutes().filter((r) => r.index !== false)];

/** Inject route-specific head tags + crawler-readable fallback content into index.html. */
export function renderHtml(template: string, pathname: string, baseUrl: string): string {
  const dynamic = dynamicRoutes().find((r) => r.path === pathname);
  const head = buildHead({ pathname, baseUrl, ...(dynamic ? { route: dynamic } : {}) });
  const attr = (a: Record<string, string>) =>
    Object.entries(a)
      .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
      .join(' ');

  const headHtml = [
    `<title data-seo-ssr>${escapeHtml(head.title)}</title>`,
    ...head.tags.map((t) => `<${t.tag} data-seo-ssr ${attr(t.attrs)}>`),
    ...head.jsonLd.map((j) => `<script type="application/ld+json" data-seo-ssr>${safeJson(j)}</script>`),
  ].join('\n    ');

  // Readable content for crawlers/agents that don't execute JS. React replaces it on mount.
  const route = head.route;
  const body = route
    ? [
        `<main data-seo-fallback>`,
        `<h1>${escapeHtml(route.title)}</h1>`,
        `<p>${escapeHtml(route.description)}</p>`,
        route.summary ? `<p>${escapeHtml(route.summary)}</p>` : '',
        route.faq?.length
          ? `<section><h2>Frequently asked questions</h2>${route.faq
              .map((f) => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`)
              .join('')}</section>`
          : '',
        `<nav><ul>${allIndexable()
          .map((r) => `<li><a href="${escapeHtml(r.path)}">${escapeHtml(r.title)}</a></li>`)
          .join('')}</ul></nav>`,
        `</main>`,
      ].join('')
    : '';

  return template.replace('<!--seo-head-->', headHtml).replace('<!--seo-body-->', body);
}

export function seoRouter(baseUrl: string): Router {
  const r = Router();

  r.get('/robots.txt', (_req, res) => {
    const { aiCrawlers, disallow } = siteConfig;
    const block = (agents: string[], allow: boolean) =>
      agents.map((a) => `User-agent: ${a}`).join('\n') +
      '\n' +
      (allow ? ['Allow: /', ...disallow.map((d) => `Disallow: ${d}`)] : ['Disallow: /']).join('\n');
    res.type('text/plain').send(
      [
        '# Search engines and general crawlers',
        block(['*'], true),
        '',
        '# AI answer / search engines (fetch pages live to cite them)',
        block(aiCrawlers.searchBots, aiCrawlers.allowSearch),
        '',
        '# AI model-training crawlers',
        block(aiCrawlers.trainingBots, aiCrawlers.allowTraining),
        '',
        `Sitemap: ${absoluteUrl(baseUrl, '/sitemap.xml')}`,
        '',
      ].join('\n'),
    );
  });

  r.get('/sitemap.xml', (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const urls = allIndexable()
      .map(
        (route) =>
          `  <url>\n    <loc>${escapeHtml(absoluteUrl(baseUrl, route.path))}</loc>\n    <lastmod>${today}</lastmod>\n` +
          (route.changefreq ? `    <changefreq>${route.changefreq}</changefreq>\n` : '') +
          (route.priority != null ? `    <priority>${route.priority.toFixed(1)}</priority>\n` : '') +
          `  </url>`,
      )
      .join('\n');
    res
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  });

  // https://llmstxt.org — a concise, markdown map of the site for LLMs.
  r.get('/llms.txt', (_req, res) => {
    const lines = [
      `# ${siteConfig.name}`,
      '',
      `> ${siteConfig.description}`,
      '',
      '## Pages',
      '',
      ...allIndexable().map((p) => `- [${p.title}](${absoluteUrl(baseUrl, p.path)}): ${p.description}`),
      '',
      '## Optional',
      '',
      `- [Full content for LLMs](${absoluteUrl(baseUrl, '/llms-full.txt')}): every page summary and FAQ in one file`,
      `- [Sitemap](${absoluteUrl(baseUrl, '/sitemap.xml')})`,
      '',
    ];
    res.type('text/markdown').send(lines.join('\n'));
  });

  r.get('/llms-full.txt', (_req, res) => {
    const sections = allIndexable().map((p) =>
      [
        `## ${p.title}`,
        '',
        `URL: ${absoluteUrl(baseUrl, p.path)}`,
        '',
        p.description,
        '',
        p.summary ?? '',
        ...(p.faq?.length ? ['', '### FAQ', '', ...p.faq.flatMap((f) => [`**${f.question}**`, '', f.answer, ''])] : []),
      ].join('\n'),
    );
    res.type('text/markdown').send([`# ${siteConfig.name}`, '', `> ${siteConfig.description}`, '', ...sections].join('\n\n'));
  });

  return r;
}

export { seoRoutes };
