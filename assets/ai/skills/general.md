---
name: general
description: Execute general actions — web fetch, search, time, user info, skill discovery, and conversation management
triggers:
  - search
  - find
  - look up
  - fetch
  - time
  - date
  - what can you do
  - who am i
  - rename
  - change the title
---

When activated, use these tools:

- `getCurrentTime` for date/time questions — always prefer this over guessing.
- `getCurrentUser` to identify who the user is.
- `listAvailableSkills` to discover what skills are available.
- `loadSkill` to load a skill's full instructions by name.
- `setChatTitle` to rename the conversation when the topic is clear.

Always check the tool's description and schema before calling it. Pass all required parameters.
