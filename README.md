# Sidekick

A personal AI assistant powered by OpenRouter, built with SvelteKit. Chat with LLMs and let the AI interact with your connected services — GitHub, Jira, Laravel Forge, and more.

## Features

- **Multi-model chat** — powered by OpenRouter with hundreds of models (GPT, Claude, Gemini, etc.)
- **Custom agents** — reusable assistants with their own system prompts, model, and behavior. Attach any agent to any conversation.
- **Streaming with reasoning** — see the model's thinking process before the final response, auto-collapsed when content arrives
- **GitHub integration** — browse repos, issues, PRs, and user commits
- **Jira integration** — search issues, view projects, query with JQL
- **Laravel Forge integration** — manage servers, sites, and deployments
- **Context7 integration** — live documentation lookups for libraries and frameworks
- **Firecrawl integration** — scrape web pages and search the web with full page content
- **Sentry integration** — look up errors, stack traces, and production issues
- **Image generation** — create images from text prompts with 7 model options
- **Video generation** — generate videos from prompts or reference images with 15 model options
- **Skill system** — extensible prompt injections triggered by keywords (8 built-in skills)
- **Chat history** — persistent conversations with sidebar navigation and rename support
- **Profile & auth** — email/password, GitHub OAuth, Atlassian OAuth, account linking, API key management

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### Required environment variables

| Variable               | Description                                |
| ---------------------- | ------------------------------------------ |
| `DATABASE_URL`         | SQLite database path, e.g. `file:local.db` |
| `OPENROUTER_API_KEY`   | OpenRouter API key for AI model access     |
| `GITHUB_CLIENT_ID`     | GitHub OAuth client ID (for login)         |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret (for login)     |
| `BETTER_AUTH_SECRET`   | Auth session encryption secret (32+ chars) |

### Optional environment variables

| Variable                  | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `GITHUB_TOKEN`            | GitHub PAT (fallback for unlinked users, increases rate limits)    |
| `ATLASSIAN_CLIENT_ID`     | Atlassian OAuth client ID (enables Atlassian sign-in + Jira tools) |
| `ATLASSIAN_CLIENT_SECRET` | Atlassian OAuth client secret                                      |
| `ATLASSIAN_CLOUD_ID`      | Bypasses auto-detection of the Jira cloud ID                       |
| `CONTEXT7_API_KEY`        | Context7 SDK key (server-wide fallback)                            |
| `FIRECRAWL_API_KEY`       | Firecrawl API key (server-wide fallback)                           |
| `SENTRY_AUTH_TOKEN`       | Sentry auth token for error lookup tools                           |
| `SENTRY_ORG`              | Sentry organization slug (required alongside `SENTRY_AUTH_TOKEN`)  |

## AI Tools

The AI can call tools to interact with external services. Tools are conditionally enabled based on the user's connected accounts and API keys.

### Always Available

| Tool                  | Description                                        |
| --------------------- | -------------------------------------------------- |
| `getCurrentTime`      | Get current date/time in ISO format                |
| `getCurrentUser`      | Get current logged-in user info                    |
| `listAvailableSkills` | List all skills with names, descriptions, triggers |
| `loadSkill`           | Load full content of a skill by name               |
| `setChatTitle`        | Rename a chat conversation                         |

### GitHub

Requires GitHub OAuth linked account. Falls back to `GITHUB_TOKEN` env var.

| Tool                     | Description                         |
| ------------------------ | ----------------------------------- |
| `getGitHubRepository`    | Get repository info                 |
| `listGitHubPullRequests` | List PRs (`state`, `limit`)         |
| `getGitHubPullRequest`   | Get detailed PR info                |
| `listGitHubIssues`       | List issues (`state`, `limit`)      |
| `getGitHubIssue`         | Get detailed issue info             |
| `getUserCommits`         | Get recent commits by a GitHub user |

### Jira

Requires Atlassian OAuth linked account. Cloud ID auto-detected or set via `ATLASSIAN_CLOUD_ID`.

| Tool               | Description                                |
| ------------------ | ------------------------------------------ |
| `getJiraIssue`     | Get issue details by key (e.g. `PROJ-123`) |
| `searchJiraIssues` | Search issues using JQL                    |
| `getJiraProjects`  | List accessible projects                   |

### Laravel Forge

Requires API key in profile settings (provider `laravel-forge`).

| Tool                     | Description              |
| ------------------------ | ------------------------ |
| `listForgeOrganizations` | List organizations       |
| `listForgeServers`       | List servers for an org  |
| `listForgeSites`         | List sites for an org    |
| `listForgeDeployments`   | List recent deployments  |
| `createForgeDeployment`  | Trigger a new deployment |

### Context7

Requires API key in profile settings (provider `context7`) or `CONTEXT7_API_KEY` env var.

| Tool                    | Description                              |
| ----------------------- | ---------------------------------------- |
| `context7SearchLibrary` | Search for a library in docs index       |
| `context7GetDocs`       | Get documentation snippets for a library |

### Firecrawl

Requires API key in profile settings (provider `firecrawl`) or `FIRECRAWL_API_KEY` env var.

| Tool                 | Description                                 |
| -------------------- | ------------------------------------------- |
| `firecrawlScrapeUrl` | Scrape a URL and return content as markdown |
| `firecrawlSearch`    | Search the web with full page content       |

### Sentry

Requires API key in profile settings (provider `sentry`) or `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` env vars.

| Tool                 | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `sentryListProjects` | List Sentry projects                                                |
| `sentryListIssues`   | List issues with filters (`status`, `statsPeriod`, `limit`, `sort`) |
| `sentryGetIssue`     | Get full issue details with stack trace                             |

### Image Generation

Always available. Images saved to `static/generated-images/`. 7 model options including `openai/gpt-image-1` (default), `google/gemini-2.5-flash-image-preview`, `black-forest-labs/flux-1.1-pro`, and more.

| Tool              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `generateImage`   | Generate an image from a text prompt (`prompt`, `model`, `size`, `n`) |
| `listImageModels` | List available image models with descriptions                         |

### Video Generation

Always available. Videos saved to `static/generated-videos/`. 15 model options including `google/veo-3.1-fast` (default), `openai/sora-2-pro`, `kwaivgi/kling-v3.0-pro`, and more.

| Tool              | Description                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `generateVideo`   | Generate a video from prompt or reference image (`prompt`, `model`, `duration`, `aspectRatio`, `fps`, `referenceImageUrl`) |
| `listVideoModels` | List available video models with descriptions                                                                              |

## Skills

Skills are prompt injections triggered by keywords in user messages. Defined in `assets/ai/skills/*.md`.

| Skill                | Trigger Words                                                                                                                                    | Description                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **general**          | search, find, fetch, time, date, rename, what can you do, who am i                                                                               | General actions — web fetch, search, time, user info, conversations |
| **github**           | github, repository, repo, pull request, pr, issue, commit, git                                                                                   | GitHub interaction — repos, PRs, issues, commits                    |
| **jira**             | jira, issue, ticket, jql, atlassian, project, task, story, bug                                                                                   | Jira interaction — issues, JQL search, projects                     |
| **context7**         | how do i, how to, documentation, docs, library, framework, sdk, api, code example, syntax, implement                                             | Documentation lookups for libraries and frameworks                  |
| **firecrawl**        | scrape, crawl, web scrape, web search, fetch url, firecrawl                                                                                      | Web scraping and web search                                         |
| **sentry**           | sentry, error, crash, exception, stack trace, stacktrace, debug, broken, failing, 500                                                            | Sentry error investigation and debugging                            |
| **image-generation** | generate an image, create an image, draw, imagine, make a picture, design, visualize, render, generate art, ai image, paint, sketch              | Generate images from text prompts                                   |
| **video-generation** | generate a video, create a video, make a video, animate, produce a video, generate a clip, ai video, text to video, image to video, animate this | Generate videos from prompts or reference images                    |

## Integrations

| Service            | Auth         | Tools                        | Setup                          |
| ------------------ | ------------ | ---------------------------- | ------------------------------ |
| **OpenRouter**     | API key      | All AI models                | `OPENROUTER_API_KEY` env var   |
| **GitHub**         | OAuth 2.0    | Repos, PRs, issues, commits  | Link account in Profile > Auth |
| **Atlassian/Jira** | OAuth 2.0    | Issues, projects, JQL search | Link account in Profile > Auth |
| **Laravel Forge**  | Bearer token | Servers, sites, deployments  | Add key in Profile > API Keys  |
| **Context7**       | API key      | Library docs lookup          | Add key in Profile > API Keys  |
| **Firecrawl**      | API key      | Web scraping and search      | Add key in Profile > API Keys  |
| **Sentry**         | Auth token   | Error lookup and debugging   | Add key in Profile > API Keys  |

## Project structure

```
src/
├── lib/
│   ├── components/
│   │   ├── AgentSelector.svelte        # Agent picker dropdown
│   │   ├── LabLogo.svelte              # Provider logo from models.dev
│   │   ├── MarkdownRenderer.svelte     # Markdown with syntax highlighting + copy buttons
│   │   ├── ModelSelector.svelte        # AI model picker (grouped by lab, with cost tiers)
│   │   └── ui/                         # shadcn-svelte components
│   └── server/
│       ├── auth.ts                     # Better Auth configuration
│       ├── db/
│       │   ├── schema.ts               # App schema (agent, chat, message, task)
│       │   └── auth.schema.ts          # Auth schema (user, session, account, apiKey)
│       └── ai/
│           ├── index.ts                # OpenRouter provider + re-exports
│           ├── models.ts               # Model listing + cost calculation
│           ├── skills.ts               # Skill loader and trigger matching
│           └── tools/
│               ├── always-available.ts  # Core tools (time, user, skills, chat rename)
│               ├── github.ts            # GitHub API tools
│               ├── jira.ts              # Jira API tools
│               ├── forge.ts             # Laravel Forge API tools
│               ├── context7.ts          # Context7 docs lookup tools
│               ├── firecrawl.ts         # Firecrawl scrape/search tools
│               ├── sentry.ts            # Sentry error tracking tools
│               ├── image-generation.ts  # AI image generation tools
│               └── video-generation.ts  # AI video generation tools
├── routes/
│   ├── chat/[[chatId]]/                # Main chat interface
│   ├── api/
│   │   ├── chat/stream/                # POST — streaming AI chat endpoint
│   │   └── models/                     # GET — available models
│   ├── login/                          # Login (email, GitHub, Atlassian)
│   ├── register/                       # Registration
│   ├── profile/                        # Edit profile
│   ├── profile/auth/                   # Email/password, OAuth linking
│   ├── profile/api-keys/               # API key management
│   └── profile/agents/                 # Custom agent CRUD
└── hooks.server.ts                     # Better Auth session handler
```

## Database

Uses SQLite via libSQL with Drizzle ORM.

| Table          | Purpose                                                         |
| -------------- | --------------------------------------------------------------- |
| `user`         | User accounts (email, username, bio, avatar)                    |
| `session`      | Active sessions                                                 |
| `account`      | OAuth accounts and email/password credentials                   |
| `apiKey`       | User-stored API keys for integrations                           |
| `agent`        | Custom AI agents (name, system prompt, model)                   |
| `chat`         | Conversations (title, model, assigned agent)                    |
| `message`      | Messages with role, content, reasoning, tool calls, token usage |
| `verification` | Email verification tokens                                       |

## Scripts

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `pnpm dev`         | Start dev server                |
| `pnpm build`       | Build for production            |
| `pnpm check`       | Type-check with svelte-check    |
| `pnpm lint`        | Lint with Prettier & ESLint     |
| `pnpm format`      | Format with Prettier            |
| `pnpm db:generate` | Generate Drizzle migrations     |
| `pnpm db:migrate`  | Run Drizzle migrations          |
| `pnpm db:push`     | Push schema changes to database |
| `pnpm db:studio`   | Open Drizzle Studio             |
