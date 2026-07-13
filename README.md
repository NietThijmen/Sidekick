# AI Assistant

A personal AI assistant powered by OpenRouter, built with SvelteKit. Chat with LLMs and let the AI interact with your connected services — GitHub, Jira, Laravel Forge, and more.

## Features

- **Multi-model chat** — powered by OpenRouter with access to hundreds of models (GPT, Claude, Gemini, etc.)
- **GitHub integration** — browse repos, issues, PRs, and user commits
- **Jira integration** — search issues, view projects, query with JQL
- **Laravel Forge integration** — manage servers, sites, and deployments
- **Firecrawl integration** — scrape web pages and search with full page content
- **Sentry integration** — look up errors, stack traces, and production issues
- **Skill system** — extensible prompt injections triggered by keywords
- **Chat history** — persistent conversations with sidebar navigation
- **Profile & auth** — GitHub/Atlassian OAuth linking, API key management

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### Required environment variables

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI model access |
| `GITHUB_TOKEN` | GitHub personal access token (fallback for unlinked users) |
| `ATLASSIAN_CLIENT_ID` | Atlassian OAuth client ID |
| `ATLASSIAN_CLIENT_SECRET` | Atlassian OAuth client secret |

### Optional environment variables

| Variable | Description |
|---|---|
| `ATLASSIAN_CLOUD_ID` | Bypasses auto-detection of the Jira cloud ID |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID (for login) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret (for login) |
| `BETTER_AUTH_URL` | Base URL for auth redirects (defaults to `localhost:5173`) |
| `BETTER_AUTH_SECRET` | Secret for auth session encryption |
| `CONTEXT7_API_KEY` | Context7 SDK key for live documentation lookups |
| `FIRECRAWL_API_KEY` | Firecrawl API key for web scraping and search |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for error lookup tools |
| `SENTRY_ORG` | Sentry organization slug (required alongside `SENTRY_AUTH_TOKEN`) |

## Database

Uses SQLite via libSQL with Drizzle ORM. Run migrations with:

```bash
pnpm db:generate
pnpm db:migrate
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm check` | Type-check with svelte-check |
| `pnpm lint` | Lint with Prettier & ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm auth:schema` | Regenerate the auth database schema |
