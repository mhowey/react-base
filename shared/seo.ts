import { seoRoutes, siteConfig, type SeoRoute } from './seo.config';

export interface HeadTag {
  tag: 'meta' | 'link';
  attrs: Record<string, string>;
}

export interface HeadData {
  title: string;
  tags: HeadTag[];
  jsonLd: Record<string, unknown>[];
  route: SeoRoute | null;
}

const notFoundRoute: SeoRoute = {
  path: '*',
  title: `Page not found — ${siteConfig.name}`,
  description: 'The page you were looking for does not exist.',
  index: false,
};

function patternToRegex(pattern: string): RegExp {
  const src = pattern
    .split('/')
    .map((seg) => {
      if (seg === '*') return '.*';
      if (seg.startsWith(':')) return '[^/]+';
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${src}/?$`);
}

export function matchSeoRoute(pathname: string, routes: SeoRoute[] = seoRoutes): SeoRoute | null {
  return routes.find((r) => patternToRegex(r.path).test(pathname)) ?? null;
}

export function absoluteUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Build every head tag + JSON-LD block for a route. Pure: used by client and server. */
export function buildHead(opts: {
  pathname: string;
  baseUrl: string;
  route?: SeoRoute | null;
  overrides?: Partial<SeoRoute>;
}): HeadData {
  const matched = opts.route === undefined ? matchSeoRoute(opts.pathname) : opts.route;
  const route: SeoRoute = { ...(matched ?? notFoundRoute), ...opts.overrides };
  const canonical = absoluteUrl(opts.baseUrl, opts.pathname);
  const image = absoluteUrl(opts.baseUrl, route.ogImage ?? siteConfig.defaultOgImage);
  const indexable = route.index !== false && matched !== null;

  const meta = (attrs: Record<string, string>): HeadTag => ({ tag: 'meta', attrs });
  const tags: HeadTag[] = [
    meta({ name: 'description', content: route.description }),
    meta({ name: 'robots', content: indexable ? 'index,follow,max-image-preview:large,max-snippet:-1' : 'noindex,nofollow' }),
    meta({ property: 'og:type', content: route.schemaType === 'Article' ? 'article' : 'website' }),
    meta({ property: 'og:site_name', content: siteConfig.name }),
    meta({ property: 'og:title', content: route.title }),
    meta({ property: 'og:description', content: route.description }),
    meta({ property: 'og:url', content: canonical }),
    meta({ property: 'og:image', content: image }),
    meta({ property: 'og:locale', content: siteConfig.locale }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:site', content: siteConfig.twitterHandle }),
    meta({ name: 'twitter:title', content: route.title }),
    meta({ name: 'twitter:description', content: route.description }),
    meta({ name: 'twitter:image', content: image }),
  ];
  if (route.keywords?.length) tags.push(meta({ name: 'keywords', content: route.keywords.join(', ') }));
  if (indexable) tags.push({ tag: 'link', attrs: { rel: 'canonical', href: canonical } });

  const jsonLd: Record<string, unknown>[] = [];
  if (indexable) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': route.schemaType ?? 'WebPage',
      name: route.title,
      description: route.description,
      url: canonical,
      inLanguage: siteConfig.language,
      isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: opts.baseUrl },
      ...(route.summary ? { abstract: route.summary } : {}),
    });
    if (opts.pathname === '/') {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteConfig.organization.name,
        url: opts.baseUrl,
        logo: absoluteUrl(opts.baseUrl, siteConfig.organization.logo),
        sameAs: siteConfig.organization.sameAs,
      });
    }
    if (route.faq?.length) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: route.faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
    }
  }

  return { title: route.title, tags, jsonLd, route: matched };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON safe to embed in a <script> element. */
export function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function indexableRoutes(): SeoRoute[] {
  return seoRoutes.filter((r) => r.index !== false && !r.path.includes(':') && !r.path.includes('*'));
}
