---
name: github
description: Interact with GitHub — repos, pull requests, issues, and user commits
triggers:
  - github
  - repository
  - repo
  - pull request
  - pr
  - issue
  - commit
  - git
  - what did i do
---

When activated, use these GitHub tools:

- `getGitHubRepository` to get metadata about a repo.
- `listGitHubPullRequests` / `getGitHubPullRequest` for PR information.
- `listGitHubIssues` / `getGitHubIssue` for issue tracking.
- `getUserCommits` to answer "what did I do today" or recent activity questions.

If a tool needs a GitHub username and none is provided, it defaults to the authenticated user.
