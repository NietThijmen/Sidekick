---
name: svelte
description: Deep assistance with Svelte 5 and SvelteKit
triggers:
  - svelte
  - component
  - rune
  - store
  - $state
  - $effect
  - $props
  - page.server
  - layout
---

When activated, apply Svelte 5 and SvelteKit best practices.

- Use runes (`$state`, `$props`, `$effect`, `$derived`) instead of Svelte 4 stores when appropriate.
- For components, prefer runes over legacy reactive statements.
- Use `bind:ref` correctly with shadcn-svelte components (initialize to `null`, not `undefined`).
- Keep server logic in `+page.server.ts` or API routes.
- Use SvelteKit's form actions and `enhance` for mutations.
