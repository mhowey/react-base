# prompt.md — Application Requirements & AI Build Prompt

This file turns the starter into **your** application. Fill in **Part 2 (Requirements)**, then give the whole file to an AI coding assistant (Claude Code, Cursor, Copilot, etc.) with a message such as:

> Read `prompt.md` and build the application it describes on top of this codebase. Work through the milestones in order, and stop after each one so I can review it.

**Part 1** is the standing brief for the AI: what already exists and the rules it must follow. Edit it only when you change the base itself. Delete the `<!-- guidance -->` comments as you fill things in, or leave them for the AI to read.

---

## Part 1 — Brief for the AI (do not delete)

You are extending an existing full-stack starter. **Reuse what exists. Do not replace or rebuild it.** Before you write code, read `README.md` and the files named below.

### What already exists

| Concern | Where | Notes |
|---|---|---|
| Client | `src/` | React 19, Vite, React Router 7, TanStack Query, TypeScript (strict) |
| Component library | `@mantine/core` (+ `form`, `notifications`, `modals`), `@tabler/icons-react` | Use these. Do not add another UI kit or CSS framework. |
| Design system | `src/design-system/` | `tokens.ts` holds raw values. `theme.ts` holds Mantine theme and component defaults. `components.tsx` holds shared components (`PageHeader`, `EmptyState`, `StatCard`, `FeatureCard`, `Section`, `Logo`, `ColorSchemeToggle`). |
| Layout | `src/layouts/AppLayout.tsx` | Header/nav/footer and the `Page` container. Nav links are defined at the top of this file. |
| Routing | `src/App.tsx` | Lazy-loaded routes. Wrap protected routes in `<RequireAuth>` or `<RequireAuth admin>`. |
| Auth (client) | `src/auth/AuthProvider.tsx` | `useAuth()` returns `user`, `isAdmin`, `loginWith`, `logout`, and more. |
| Auth (server) | `server/auth/` | Passport OAuth (Google, Facebook, GitHub), with a JWT in an httpOnly cookie. Use `requireAuth` / `requireAdmin` middleware. Add providers in `providers.ts`. |
| Users | `users`, `user_identities` tables; `server/users/repo.ts` | Roles are `user` and `admin`. |
| Database | SQLite via `better-sqlite3`; `server/db/` | System migrations live in `server/db/migrations.ts` (append-only). |
| Data builder | `server/schema/service.ts`, `/admin/data` UI | Creates app tables and fields at runtime. Each table gets `id`, `created_at`, `updated_at`, `created_by`. |
| Generic data API | `server/data/service.ts`, `/api/data/:table` | CRUD with validation, search, sort, filters and pagination. Read/write access is set per table. |
| Schema as code | `GET /api/schema/export`, `POST /api/schema/import`, `GET /api/schema/types.ts` | Export JSON for version control. Import is additive. |
| SEO / AIO | `shared/seo.config.ts`, `shared/seo.ts`, `src/seo/Seo.tsx`, `server/seo/` | Server-injected meta, OG and JSON-LD; crawler fallback HTML; `sitemap.xml`; `robots.txt` with an AI-bot policy; `llms.txt`; `llms-full.txt`. `registerSeoSource()` handles dynamic pages. |
| API client | `src/lib/api.ts` | `api.get/post/patch/put/delete` and `errorMessage()`. |
| Tests | `vitest` + `supertest`; `server/app.test.ts`, `shared/seo.test.ts` | Run with `npm test`. |

### Rules

1. **Data model.** Define application tables in `schema/app-schema.json` using the format of `GET /api/schema/export` (see Part 2 §5). Load it with `POST /api/schema/import`, or at server boot with `schema.importSchema()`. Do not hand-write `CREATE TABLE` for app data. Hand-written SQL migrations (`server/db/migrations.ts`) are only for things the builder cannot express, such as composite indexes, triggers, full-text search, or views. Say why each one is needed.
2. **APIs.** Use `/api/data/:table` for plain CRUD. Add a custom route in `server/` only for business logic: multi-table writes, computed results, workflows, or third-party calls. Validate input with `zod`, throw `HttpError` from `server/errors.ts`, and protect the route with `requireAuth` / `requireAdmin`.
3. **UI.** Build with Mantine components and the design-system components. Never hard-code colours, spacing or fonts. Use theme tokens, Mantine props, or the `var(--app-*)` semantic variables. If a new pattern repeats, add it to `src/design-system/components.tsx` and show it on `/design-system`. Everything must work in light mode, dark mode and at 375px width.
4. **Data fetching.** Use TanStack Query with `api` from `src/lib/api.ts`. Show loading, empty (`EmptyState`) and error states. Report success and failure with `notifications`.
5. **SEO/AIO.** Every public route needs an entry in `seoRoutes` (`shared/seo.config.ts`) with a title, description, `summary` and, where useful, `faq`. Private routes use `index: false`. Register dynamic public pages (for example `/blog/:slug`) with `registerSeoSource()`, and pass `overrides` to `<Seo />` on that page. Use semantic HTML: one `<h1>` per page, then headings in order, and descriptive link text.
6. **Auth.** Never trust the client. Enforce permissions on the server. Use the table `readAccess`/`writeAccess` settings first, and custom checks only when needed. Keep `ENABLE_DEV_LOGIN` off in production.
7. **Types.** TypeScript must stay strict. Put types shared by the client and server in `shared/`. Regenerate table types from `/api/schema/types.ts` into `shared/generated-types.ts` when the schema changes.
8. **Quality gates.** Every milestone must end with `npm run typecheck`, `npm test` and `npm run build` passing. Add tests for each custom server route and for any business rules.
9. **Scope.** Build only what Part 2 asks for. If a requirement is ambiguous, write down the assumption you made in **Part 3 — Decision log** rather than guessing silently.
10. **Configuration.** Add every new environment variable to `.env.example` with a comment. Never commit secrets.

### How to report back after each milestone

- What you built (files changed, new routes, tables and fields)
- How to try it (URLs, sample data, any `.env` keys needed)
- Assumptions, plus anything that is deferred or a known gap

---

## Part 2 — Application Requirements (fill this in)

### 1. Product overview

<!-- guidance: 2–4 sentences. What is it, who is it for, what problem does it solve, and what makes it different? -->

- **App name:** News Scraper Service
- **One-line description:** A news aggregator service
- **Tagline:** get the news you want, free!
- **Production URL:** aggrex.netlify.app
- **Problem it solves:** having a mixed source of multiple headlines categorized by left or right lean of the source.
- **Primary success metric:** 2 regular users

### 2. Users & roles

<!-- guidance: The base has `user` and `admin`. List any extra roles. If you need more than these two, the AI must extend `users.role` (migration + CHECK) and the guards. -->

| Role | Who they are | What they can do | What they cannot do |
|---|---|---|---|
| Visitor (anonymous) | | | |
| User | standard user| see news, build a custom news list, adjust other parameters of their news feeds. They can only create a limited number of modifications. Come up with a revenue model here | any admin function |
| Admin | admin user| everything | |

### 3. Authentication

- **Sign-in providers to enable:** ☐ Google ☐ Facebook ☐ GitHub
______
- **Who may sign up:** anyone
______
- **Initial admins (`ADMIN_EMAILS`):** howey.matt@gmail.com
- **Onboarding after first sign-in:** collect user news feed preferences
- **Account deletion / data export required?** no

### 4. Features

High-level: Users will be able to view a customized newsfeed that has been scraped from the web. Use your knowledge to do a good job of choosing a wide variety of news article source from around the web. They should be ranked by their category of news as well as whether they tend to lean left or right. 



### 5. Data model

Make the data model as needed to create the features.


### 6. Design & branding

Come up with a professional modern clean designed User Interface that a user will be delighted to use and makes using the feature so intuitive it's almost fun!

## Part 3 — Decision log

- **Milestone 1 scope:** Ship the public, responsive news reader first. It uses a curated set of publisher RSS feeds and links to original articles; it does not scrape article pages or republish full text.
- **Editorial labels:** Initial lean labels are broad, source-level context (left through right), not per-story judgments or endorsements. They should be reviewed and made transparent before relying on them as a ranking signal.
- **Deferred:** Account onboarding, saved/custom source lists, per-user preferences, and any paid tier are not part of this first milestone. Keep the core reader free; revisit monetization only after validating regular use.
- **Hosting assumption:** The existing Express server is required for RSS aggregation. The listed Netlify URL must use a compatible server deployment or a serverless adapter; a static-only Netlify deployment will not run these API routes.