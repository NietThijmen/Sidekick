---
name: agents
description: Create and manage custom AI agents with their own system prompts, models, and descriptions
triggers:
  - agent
  - agents
  - create agent
  - new agent
  - edit agent
  - update agent
  - custom agent
  - my agents
  - bot
  - persona
  - assistant
---

When activated, use these agent tools:

- `getAvailableAgents` to list all agents the user has created.
- `createAgent` to make a new agent. Required: `name`. Optional: `description`, `systemPrompt`, `model` (defaults to `openai/gpt-5.6-luna`).
- `editAgent` to update an existing agent. Required: `id`. Optional: `name`, `description`, `systemPrompt`, `model`. Only pass fields that need to change.

## Guidelines

- If the user asks to create an agent, ask for a name if not provided, then optionally clarify the purpose, system prompt, and model.
- If the user asks to edit an agent, first use `getAvailableAgents` if you do not know the agent's ID.
- Use the agent's `systemPrompt` to define its personality, rules, constraints, and special instructions.
- Keep agent names concise and descriptive.
- After creating or editing an agent, summarize what was changed.
