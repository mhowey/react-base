import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { SeoRoute } from '@shared/seo.config';
import { buildHead, safeJson } from '@shared/seo';

const baseUrl = () => import.meta.env.VITE_SITE_URL || window.location.origin;

/**
 * Renders title / meta / canonical / JSON-LD for the current route using
 * React 19's native document-metadata hoisting. Values come from
 * shared/seo.config.ts, the same source the server uses for crawlers.
 *
 * Pass `overrides` for dynamic pages, e.g. <Seo overrides={{ title: post.title, description: post.excerpt }} />
 */
export function Seo({ overrides }: { overrides?: Partial<SeoRoute> }) {
  const { pathname } = useLocation();
  const head = buildHead({ pathname, baseUrl: baseUrl(), overrides });

  // The server injected the same tags for crawlers; remove them once React owns the head.
  useEffect(() => {
    document.querySelectorAll('[data-seo-ssr]').forEach((el) => el.remove());
  }, []);

  return (
    <>
      <title>{head.title}</title>
      {head.tags.map((t) =>
        t.tag === 'meta' ? <meta key={JSON.stringify(t.attrs)} {...t.attrs} /> : <link key={JSON.stringify(t.attrs)} {...t.attrs} />,
      )}
      {head.jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(j) }} />
      ))}
    </>
  );
}
