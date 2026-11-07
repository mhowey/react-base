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
  name: 'Aggrex',
  tagline: 'Get the news you want, free.',
  description: 'A clearer daily news feed, bringing reporting from across the editorial spectrum together in one place.',
  locale: 'en_US',
  language: 'en',
  twitterHandle: '@appstarter',
  defaultOgImage: '/og-image.svg',
  themeColor: '#4f46e5',
  organization: {
    name: 'Aggrex',
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
    question: 'What is Aggrex?',
    answer: 'Aggrex brings headlines from multiple news sources together, with topic and source-perspective labels to help readers explore a wider range of reporting.',
  },
  {
    question: 'How are source perspective labels chosen?',
    answer: 'Labels are broad editorial descriptions of a publication, not ratings of individual stories. They are intended as context, can be imperfect, and should not replace reading and comparing the reporting.',
  },
  {
    question: 'Where do the headlines come from?',
    answer: 'The first release reads publicly available RSS feeds and links readers to the original publishers. Aggrex does not republish full articles.',
  },
  {
    question: 'Is Aggrex free?',
    answer: 'The core news reading experience is free. Personalized feed controls are planned for a later release.',
  },
];

export const seoRoutes: SeoRoute[] = [
  {
    path: '/',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    keywords: ['news aggregator', 'news headlines', 'balanced news', 'current affairs'],
    schemaType: 'WebPage',
    changefreq: 'weekly',
    priority: 1,
    summary: 'A live news roundup that brings together recent headlines from a range of publishers, with filters for topic and broad editorial perspective.',
    faq: homeFaq,
  },
  {
    path: '/about',
    title: `About — ${siteConfig.name}`,
    description: 'Learn how Aggrex gathers headlines and uses source labels to make exploring different reporting easier.',
    schemaType: 'AboutPage',
    changefreq: 'monthly',
    priority: 0.7,
    summary: 'Aggrex is a free news aggregator that links to original reporting and gives readers topic and source-perspective filters.',
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
