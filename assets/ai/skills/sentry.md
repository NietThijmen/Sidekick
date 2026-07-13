---
name: sentry
description: Look up errors, stack traces, and issues in Sentry — investigate crashes, search issues, and debug production errors
triggers:
  - sentry
  - error
  - crash
  - exception
  - stack trace
  - stacktrace
  - bug report
  - production error
  - debug
  - broken
  - failing
  - 500
---

When the user needs to investigate an error, crash, or bug, use the sentry tools:

1. `sentryListProjects` — List all Sentry projects to find which project an error belongs to.

2. `sentryListIssues` — Search/list issues for a project with optional filters (status, query, time range). Use this to find recent errors.

3. `sentryGetIssue` — Get full issue details including the latest event with stack trace. Use this to debug the root cause.

Typical workflow:
- First, list projects to find the right project slug
- Then list issues to find the specific error
- Finally get the full issue to see the stack trace
