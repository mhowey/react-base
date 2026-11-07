import { describe, expect, it } from 'vitest';
import { renderHtml } from '../server/seo';
import { buildHead, matchSeoRoute } from './seo';

describe('seo', () => {
  it('matches routes including wildcards', () => {
    expect(matchSeoRoute('/')?.path).toBe('/');
    expect(matchSeoRoute('/admin/tables/x')?.path).toBe('/admin/*');
    expect(matchSeoRoute('/nope')).toBeNull();
  });

  it('builds canonical, OG and FAQ JSON-LD for indexable pages', () => {
    const head = buildHead({ pathname: '/', baseUrl: 'https://example.com' });
    expect(head.tags).toContainEqual({ tag: 'link', attrs: { rel: 'canonical', href: 'https://example.com/' } });
    expect(head.jsonLd.map((j) => j['@type'])).toEqual(['WebPage', 'Organization', 'FAQPage']);
  });

  it('marks private and unknown pages noindex', () => {
    for (const p of ['/dashboard', '/missing']) {
      const head = buildHead({ pathname: p, baseUrl: 'https://example.com' });
      expect(head.tags.find((t) => t.attrs.name === 'robots')?.attrs.content).toBe('noindex,nofollow');
      expect(head.jsonLd).toHaveLength(0);
    }
  });

  it('injects escaped head tags and fallback content into HTML', () => {
    const html = renderHtml('<head><!--seo-head--></head><div id="root"><!--seo-body--></div>', '/', 'https://example.com');
    expect(html).toContain('<title data-seo-ssr>');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('<main data-seo-fallback>');
  });
});
