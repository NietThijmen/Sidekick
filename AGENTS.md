## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, tailwindcss, sveltekit-adapter, drizzle, better-auth, mdsvex, mcp

## AI / OpenRouter

- Uses the [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`) with the official [`@openrouter/ai-sdk-provider`](https://github.com/OpenRouterTeam/ai-sdk-provider).
- Shared server library: `src/lib/server/ai/index.ts`.
- Configure with the `OPENROUTER_API_KEY` environment variable.
- Atlassian OAuth is configured in `src/lib/server/auth.ts` using `ATLASSIAN_CLIENT_ID` and `ATLASSIAN_CLIENT_SECRET`.
- Jira API tools use the Atlassian access token to call the Jira REST API. The cloud ID is auto-detected or can be set via `ATLASSIAN_CLOUD_ID`.
- Import helpers and the configured provider from `$lib/server/ai`:

  ```ts
  import { generateText, streamText } from '$lib/server/ai';
  import { openrouter } from '$lib/server/ai';

  const { text } = await generateText({
  	model: openrouter('openai/gpt-4o'),
  	prompt: '...'
  });
  ```

## AI Skills System

- Editable system prompt: `assets/ai/system.md`.
- Skill definitions: `assets/ai/skills/**/*.md`.
- Skill loader: `src/lib/server/ai/skills.ts`.
- Skills are auto-discovered at request time and activated by trigger-word matching.
- Skill format (YAML frontmatter + Markdown body):

  ```md
  ---
  name: example
  description: What this skill does
  triggers:
    - keyword
  ---

  Instructions injected into the system prompt when activated.
  ```

- Import helpers from `$lib/server/ai`:

  ```ts
  import {
  	loadSystemPrompt,
  	loadSkills,
  	findActiveSkills,
  	buildSystemPrompt
  } from '$lib/server/ai';
  ```

## UI / shadcn-svelte

- Uses [shadcn-svelte](https://shadcn-svelte.com/) for UI components.
- Configuration: `components.json`.
- Component style: `rhea`, base color: `neutral`, icons: `lucide`.
- Component aliases:
  - `$lib/components` for components
  - `$lib/components/ui` for UI components
  - `$lib/utils` for utilities
  - `$lib/hooks` for hooks
- Add new components with:

  ```bash
  pnpm dlx shadcn-svelte@latest add <component>
  ```

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
