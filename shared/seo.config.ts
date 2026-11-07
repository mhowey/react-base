/**
 * Single source of truth for SEO (search engines) and AIO (AI answer engines /
 * LLM crawlers). It is consumed by:
 *   - the client  <Seo /> component (title, meta, Open Graph, JSON-LD)
 *   - the server  HTML injector (crawlers that don't run JS get full meta + content)
 *   - the server  /sitemap.xml, /robots.txt, /llms.txt, /llms-full.txt endpoints
 *
 * Add a route here whenever you add a public page.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SeoRoute {
  /** Path pattern. Supports `:param` segments, e.g. `/blog/:slug`. */
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  /** schema.org type of the page's primary entity. */
  schemaType?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'Article' | 'FAQPage';
  /** Set false for private / app pages: emits noindex and omits from sitemap + llms.txt. */
  index?: boolean;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  ogImage?: string;
  /**
   * Plain-language summary of what the page contains. Rendered into the static
   * HTML (for non-JS crawlers) and into /llms.txt so AI engines can cite it.
   */
  summary?: string;
  /** Question/answer pairs. Emitted as FAQPage JSON-LD and in /llms-full.txt. */
  faq?: FaqItem[];
}

export const siteConfig = {
  name: 'App Starter',
  tagline: 'A production-ready foundation for full-stack React apps',
  description:
    'App Starter is a full-stack React foundation with a design system, social sign-in, SEO and AI-search optimization, and a SQLite schema builder.',
  locale: 'en_US',
  language: 'en',
  twitterHandle: '@appstarter',
  defaultOgImage: '/og-image.svg',
  themeColor: '#4f46e5',
  organization: {
    name: 'App Starter',
    logo: '/logo.svg',
    sameAs: [] as string[],
  },
  /**
   * AI crawler policy for robots.txt.
   *  - `search` bots fetch pages to answer a user's question live and cite you (good for AIO).
   *  - `training` bots collect content for model training.
   */
  aiCrawlers: {
    allowSearch: true,
    allowTraining: false,
    searchBots: ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'DuckAssistBot'],
    trainingBots: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Bytespider'],
  },
  /** Paths never crawled by anyone. */
  disallow: ['/api/', '/admin', '/dashboard', '/profile', '/login'],
};

export const homeFaq: FaqItem[] = [
  {
    question: 'What is App Starter?',
    answer:
      'App Starter is a template for building full-stack React applications. It ships with a Mantine-based design system, OAuth sign-in (Google, Facebook, GitHub), SEO and AI-search optimization, and a SQLite backend with a visual table builder.',
  },
  {
    question: 'Which sign-in providers are supported?',
    answer:
      'Google, Facebook and GitHub are built in. Any Passport.js strategy can be added by registering it in server/auth/providers.ts. A passwordless dev login is available in development.',
  },
  {
    question: 'How does App Starter optimize for AI search engines?',
    answer:
      'Every public page is served with server-rendered meta tags, JSON-LD structured data and a readable content fallback. The server also publishes /llms.txt and /llms-full.txt and a robots.txt with a configurable policy for AI search and training crawlers.',
  },
  {
    question: 'Can I define my own database tables?',
    answer:
      'Yes. Admins can create tables and typed fields in the Data Builder UI. Each table immediately gets a validated REST API, an admin data browser and generated TypeScript types.',
  },
];

export const seoRoutes: SeoRoute[] = [
  {
    path: '/',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    keywords: ['react starter', 'full-stack template', 'design system', 'oauth', 'sqlite', 'seo', 'ai search'],
    schemaType: 'WebPage',
    changefreq: 'weekly',
    priority: 1,
    summary:
      'Landing page describing the four pillars of App Starter: a themeable design system, third-party authentication, SEO/AIO tooling and a SQLite data builder.',
    faq: homeFaq,
  },
  {
    path: '/about',
    title: `About — ${siteConfig.name}`,
    description: 'Learn how App Starter is structured and how to extend it into a full application.',
    schemaType: 'AboutPage',
    changefreq: 'monthly',
    priority: 0.7,
    summary:
      'Explains the project architecture (React + Vite client, Express + SQLite server, shared config) and the recommended workflow for turning the starter into a product.',
  },
  {
    path: '/design-system',
    title: `Design System — ${siteConfig.name}`,
    description: 'Tokens, themes and reusable components that make up the App Starter design system.',
    schemaType: 'CollectionPage',
    changefreq: 'monthly',
    priority: 0.5,
    summary: 'Live reference of colour, typography, spacing and radius tokens plus the shared component library in light and dark mode.',
  },
  { path: '/login', title: `Sign in — ${siteConfig.name}`, description: 'Sign in to your account.', index: false },
  { path: '/dashboard', title: `Dashboard — ${siteConfig.name}`, description: 'Your dashboard.', index: false },
  { path: '/profile', title: `Profile — ${siteConfig.name}`, description: 'Your profile.', index: false },
  { path: '/admin/*', title: `Admin — ${siteConfig.name}`, description: 'Administration.', index: false },
];
