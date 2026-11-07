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

- **App name:**
- **One-line description:** (also used as the SEO site description)
- **Tagline:**
- **Production URL:**
- **Problem it solves:**
- **Primary success metric:** (e.g. weekly active teams, bookings per week)

### 2. Users & roles

<!-- guidance: The base has `user` and `admin`. List any extra roles. If you need more than these two, the AI must extend `users.role` (migration + CHECK) and the guards. -->

| Role | Who they are | What they can do | What they cannot do |
|---|---|---|---|
| Visitor (anonymous) | | | |
| User | | | |
| Admin | | | |

### 3. Authentication

- **Sign-in providers to enable:** ☐ Google ☐ Facebook ☐ GitHub ☐ Other: ______
- **Who may sign up:** ☐ anyone ☐ invite-only ☐ specific email domains: ______
- **Initial admins (`ADMIN_EMAILS`):**
- **Onboarding after first sign-in:** (e.g. collect company name, accept terms)
- **Account deletion / data export required?**

### 4. Features

<!-- guidance: One block per feature, in priority order. Acceptance criteria should be testable. Copy the block as many times as you need. -->

#### F1. <Feature name>
- **Priority:** Must / Should / Could
- **User story:** As a <role>, I want <capability> so that <benefit>.
- **Details / business rules:**
  -
- **Acceptance criteria:**
  - [ ] Given …, when …, then …
  - [ ]
- **Pages / UI involved:**
- **Data involved:** (tables from §5)
- **Edge cases:**

#### F2. <Feature name>
- **Priority:**
- **User story:**
- **Details / business rules:**
- **Acceptance criteria:**
  - [ ]

### 5. Data model

<!-- guidance:
Describe each table in the Data Builder's format. The AI turns this into `schema/app-schema.json` and imports it.
Field types: text, longtext, integer, number, boolean, date, datetime, email, url, select, json, relation
Options: select → choices[]; relation → relationTable; text/longtext → min/max length; integer/number → min/max value
readAccess: public | authenticated | admin       writeAccess: authenticated | owner | admin
Every table automatically gets id, created_at, updated_at, created_by (the user who created the row).
-->

| Table | Purpose | readAccess | writeAccess | displayField |
|---|---|---|---|---|
| | | | | |

**Fields for `<table_name>`**

| Field | Type | Required | Unique | Default | Options | Description |
|---|---|---|---|---|---|---|
| | | | | | | |

<details>
<summary>Example (delete when done)</summary>

| Table | Purpose | readAccess | writeAccess | displayField |
|---|---|---|---|---|
| `projects` | A team's project | authenticated | owner | name |
| `tasks` | Work items in a project | authenticated | authenticated | title |

**`tasks`**

| Field | Type | Required | Unique | Default | Options | Description |
|---|---|---|---|---|---|---|
| title | text | ✓ | | | max 140 | Short summary |
| status | select | ✓ | | `todo` | todo, doing, done | Workflow state |
| due_on | date | | | | | |
| project | relation | ✓ | | | → projects | Parent project |
| assignee | relation | | | | → users | |

Equivalent JSON (what the AI should produce):

```json
{
  "tables": [
    {
      "name": "tasks", "label": "Tasks", "readAccess": "authenticated", "writeAccess": "authenticated", "displayField": "title",
      "fields": [
        { "name": "title", "type": "text", "required": true, "options": { "max": 140 } },
        { "name": "status", "type": "select", "required": true, "defaultValue": "todo", "options": { "choices": ["todo", "doing", "done"] } },
        { "name": "due_on", "type": "date" },
        { "name": "project", "type": "relation", "required": true, "options": { "relationTable": "projects" } },
        { "name": "assignee", "type": "relation", "options": { "relationTable": "users" } }
      ]
    }
  ]
}
```
</details>

**Business rules the generic API cannot express** (these become custom server routes, triggers or tests):
-

**Seed / demo data:**
-

### 6. Pages & navigation

<!-- guidance: Every page. "Public" pages are indexed and need SEO fields. -->

| Route | Page name | Access (public / user / admin) | Purpose & main content | In nav? |
|---|---|---|---|---|
| `/` | Home | public | | |
| | | | | |

### 7. SEO & AI-search (AIO)

- **Target keywords / topics:**
- **Target audience search intent:** (what questions are people asking?)
- **Organization details:** (legal name, logo, social profile URLs → `siteConfig.organization.sameAs`)
- **Per public page:**

| Route | Title (≤ 60 chars) | Meta description (≤ 155 chars) | Summary for AI engines (2–3 sentences, factual) | FAQ (Q → A) | schema.org type |
|---|---|---|---|---|---|
| `/` | | | | | WebPage |

- **Dynamic public pages** (e.g. blog posts, product pages, public profiles), with their URL pattern and source table:
- **AI crawler policy:** allow AI *search* bots ☐ yes ☐ no · allow AI *training* bots ☐ yes ☐ no
- **Social share image:** (1200×630, replaces `public/og-image.svg`)

### 8. Design & branding

<!-- guidance: The AI will update tokens.ts and theme.ts and must not override styles one page at a time. -->

- **Brand colours:** primary `#______`, accent `#______` (the AI generates the 10-step scales)
- **Fonts:** heading ______ / body ______
- **Corner style:** ☐ sharp ☐ soft (default) ☐ round
- **Default colour scheme:** ☐ auto (default) ☐ light ☐ dark
- **Logo:** (path, or "generate a simple SVG wordmark")
- **Tone of voice for UI copy:**
- **Reference sites / inspiration:**
- **New shared components needed:**

### 9. Integrations

| Service | Purpose | Env vars needed | Notes |
|---|---|---|---|
| (e.g. Stripe) | payments | `STRIPE_SECRET_KEY` | |
| (e.g. Resend) | transactional email | | |
| (e.g. S3 / R2) | file uploads | | |

### 10. Non-functional requirements

- **Expected scale:** users ______, rows per table ______
- **Performance:** (e.g. LCP < 2.5s on 4G, API p95 < 200ms)
- **Accessibility:** WCAG 2.2 AA (default)
- **Browsers / devices:**
- **Internationalisation:** languages ______
- **Privacy / compliance:** (GDPR, cookie consent, data retention)
- **Hosting target:** (e.g. Fly.io, Render, VPS with a persistent volume for `data/`)
- **Backups:** (e.g. nightly copy of the SQLite file / Litestream)
- **Analytics / monitoring:**

### 11. Out of scope

-

### 12. Milestones

<!-- guidance: Small, reviewable steps. The AI stops after each one. -->

1. **Foundation:** branding (tokens, `siteConfig`), roles, `.env.example`, data model imported, seed data.
2. **Core feature(s):** F1 …
3. **Secondary features:** F2 …
4. **SEO/AIO pass:** all public routes in `seoRoutes`, dynamic sources registered, `llms.txt` checked.
5. **Hardening:** tests for business rules, empty/error states, mobile + dark-mode check, production build.

---

## Part 3 — Decision log (the AI appends here)

| Date | Decision / assumption | Reason | Revisit? |
|---|---|---|---|
| | | | |
