# React Base — full-stack app starter

A foundation for building full React applications. It includes:

- **Design system.** Design tokens, a Mantine theme with component defaults, semantic CSS variables, light/dark mode, shared components, and a live reference page at `/design-system`.
- **Third-party authentication.** Google, Facebook and GitHub through Passport. Sessions are JWTs in httpOnly cookies, with `user`/`admin` roles, route guards, and a dev login for local work.
- **SEO + AIO.** One config feeds three things: server-injected meta/Open Graph/JSON-LD, readable fallback HTML for crawlers that don't run JS, and the `sitemap.xml`, `robots.txt` (with AI search/training bot policy), `llms.txt` and `llms-full.txt` endpoints.
- **SQLite data builder.** Create tables and typed fields from the admin UI. Each table immediately gets a validated REST API, a data browser, access rules, generated TypeScript types, and JSON export/import.
- **`prompt.md`.** A requirements document and AI build prompt. Fill it in and hand it to an AI assistant to build your application on top of this base.

## Stack

| | |
|---|---|
| Client | React 19, Vite, React Router 7, TanStack Query, Mantine 9, Tabler icons |
| Server | Express 5, Passport, better-sqlite3, Zod 4, Helmet |
| Tooling | TypeScript (strict), Vitest + Supertest, esbuild |

Dev and production each run as **one process on one port**. In development, Vite runs inside Express as middleware, so hot reload, the API and SEO injection all share the same origin.

## Quick start

Requires Node 20 or newer.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Open http://localhost:3000, click **Sign in**, and use the **development login**. The first account becomes admin. Then open **Data builder**.

| Script | |
|---|---|
| `npm run dev` | Dev server with HMR (Express + Vite middleware) |
| `npm run build` | Builds the client to `dist/client` and the server to `dist/server` |
| `npm start` | Runs the production build (`NODE_ENV=production`) |
| `npm test` | API, schema-builder and SEO tests |
| `npm run typecheck` | `tsc --noEmit` across client, server and shared code |
| `npm run db:reset` | Deletes the local SQLite database |

## Project layout

```
prompt.md                 Requirements + AI build prompt for your app
schema/app-schema.json    Version-controlled data model (applied additively on server start)
shared/                   Code used by both client and server
  seo.config.ts           ← site info, routes, FAQs, AI crawler policy
  seo.ts                  head-tag / JSON-LD builder
  schema-types.ts         field types, table/user types
server/
  index.ts                entry: Vite middleware (dev) or static files (prod) + HTML SEO injection
  app.ts                  Express app: security, cookies, auth, API routers
  config.ts               environment config
  db/                     SQLite connection + append-only system migrations
  auth/                   providers.ts (OAuth registry), session.ts (JWT cookie, guards), routes.ts
  schema/service.ts       data builder: DDL + metadata, table rebuilds, export/import, TS types
  data/service.ts         metadata-driven CRUD, validation, access control
  seo/index.ts            renderHtml(), robots, sitemap, llms.txt, registerSeoSource()
  api.ts                  /api/schema, /api/data, /api/users routers
src/
  design-system/          tokens.ts, theme.ts, components.tsx, global.css
  layouts/AppLayout.tsx   header / nav / footer
  auth/                   AuthProvider (useAuth), RequireAuth, provider icons
  seo/Seo.tsx             per-route head tags (React 19 metadata)
  pages/                  Home, About, DesignSystem, Login, Dashboard, Profile, admin/*
  lib/api.ts              fetch wrapper + QueryClient
```

## Design system

- **`tokens.ts`** holds the raw values: 10-step colour scales (`brand`, `accent`, `success`, `warning`, `danger`, `neutral`, `dark`), typography, spacing, radius, shadows, and **semantic tokens** that change per colour scheme (`--app-bg`, `--app-surface`, `--app-border`, `--app-text`, …).
- **`theme.ts`** maps tokens onto Mantine and sets component defaults (Card, Button, Modal, Table, …). To rebrand, change the tokens; you shouldn't need to edit pages.
- **`components.tsx`** holds app-level building blocks: `PageHeader`, `EmptyState`, `StatCard`, `FeatureCard`, `Section`, `Logo`, `ColorSchemeToggle`.

## Authentication

A provider turns on automatically when both of its env vars are set:

| Provider | Env vars | Callback URL to register |
|---|---|---|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `${APP_URL}/api/auth/google/callback` |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | `${APP_URL}/api/auth/facebook/callback` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `${APP_URL}/api/auth/github/callback` |

To add another provider (Microsoft, Apple, Discord, …), `npm i` its Passport strategy and add an entry in `server/auth/providers.ts`.

How it works:

- The OAuth `state` lives in a signed, short-lived cookie, which protects against CSRF without server sessions.
- After sign-in the server sets an httpOnly `app_session` JWT cookie. Each request loads the user fresh from the database, so role changes apply immediately.
- Identities are linked by email: signing in with Google and later with GitHub using the same email gives you one account.
- `ADMIN_EMAILS` lists emails that are always admin. If it is empty, the first user becomes admin.
- Server guards are `requireAuth` and `requireAdmin`. The client guard is `<RequireAuth admin?>`, and `useAuth()` exposes the session in components.

## SEO & AI-engine optimisation (AIO)

Everything comes from `shared/seo.config.ts`:

| Output | Purpose |
|---|---|
| `<title>`, description, robots, canonical, Open Graph, Twitter | Injected into the HTML by the server for every route, then managed by `<Seo />` on the client |
| JSON-LD `WebPage`/`AboutPage`/…, `Organization`, `FAQPage` | Structured data for rich results and AI answer engines |
| Fallback `<main>` content (h1, description, summary, FAQ, nav) | Lets crawlers and AI agents that don't execute JS read the page |
| `/sitemap.xml` | Indexable routes plus dynamic sources |
| `/robots.txt` | Separate policies for general crawlers, AI **search** bots (allowed by default) and AI **training** bots (blocked by default) |
| `/llms.txt`, `/llms-full.txt` | [llms.txt](https://llmstxt.org) site map and full content (summaries + FAQs) for LLMs |

To add a public page: add the route in `src/App.tsx` and an entry in `seoRoutes`. Private pages use `index: false`, which makes them noindex and keeps them out of the sitemap and llms.txt.

For dynamic pages such as blog posts, call `registerSeoSource(() => rows.map(r => ({ path: `/blog/${r.slug}`, title: r.title, description: r.excerpt, schemaType: 'Article' })))` in `server/` and render `<Seo overrides={{ title, description }} />` on the page.

## Data builder (SQLite)

Admins open **/admin/data** to:

- **Create tables.** Each table automatically gets `id`, `created_at`, `updated_at` and `created_by`.
- **Add, edit, reorder and delete fields.** Types are text, long text, integer, decimal, boolean, date, date-time, email, URL, select (choices), JSON, and relation (to another table or to `users`). Fields can be required or unique and can have a default value, min/max limits and a description.
- **Change a field's type or relation target.** The table is rebuilt safely using SQLite's copy-and-swap procedure, and existing rows are kept.
- **Set access per table.** `readAccess` is `public`, `authenticated` or `admin`. `writeAccess` is `authenticated`, `owner` (users can edit only rows they created) or `admin`.
- **Browse and edit records** with forms generated from the field definitions, including relation pickers.
- **Export, import and generate types.** `schema.json` (export/import) lets you keep the data model in version control and move it between environments. **Types** produces TypeScript interfaces.

### Data API

```
GET    /api/data                       tables the current user can read
GET    /api/data/:table                ?page&pageSize&sort&order=asc|desc&search&filter[field]=value
POST   /api/data/:table
GET    /api/data/:table/:id
PATCH  /api/data/:table/:id
DELETE /api/data/:table/:id
GET    /api/data/:table/schema         field metadata

/api/schema/*  (admin)  tables, fields, field-order, export, import, types.ts
/api/users     (admin)  list users, change role
```

Responses deserialize booleans and JSON. Validation errors return `400` with per-field details, and unique violations return `409`.

## Production

```bash
npm run build
```

```bash
NODE_ENV=production APP_URL=https://your.domain JWT_SECRET=... COOKIE_SECRET=... npm start
```

- Put `DATABASE_PATH` on a persistent volume and back it up (for example with Litestream).
- Run behind HTTPS. Cookies are `Secure` in production and `trust proxy` is enabled.
- The dev login is off in production unless `ENABLE_DEV_LOGIN=true`. Don't turn it on.
- Helmet sets a strict CSP in production. If you add third-party scripts or APIs, update it in `server/app.ts`.

## Building your app

Fill in **`prompt.md`**, then ask your AI assistant:

> Read `prompt.md` and build the application it describes on top of this codebase, one milestone at a time.
