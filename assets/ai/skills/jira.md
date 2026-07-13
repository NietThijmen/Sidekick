---
name: jira
description: Interact with Jira — issues, searches, and project discovery
triggers:
  - jira
  - issue
  - ticket
  - jql
  - atlassian
  - project
  - task
  - story
  - bug
---

When activated, use these Jira tools:

- `getJiraIssue` to fetch details of a specific issue by key (e.g. PROJ-123).
- `searchJiraIssues` to find issues using JQL queries.
- `getJiraProjects` to list all accessible Jira projects.

Always check the tool's description and schema before calling it. Pass all required parameters.

## JQL Reference

JQL is the Jira Query Language. When building queries for `searchJiraIssues`, follow these rules.

### Common Fields

| Field         | Example                                          |
| ------------- | ------------------------------------------------ |
| `project`     | `project = PROJ`                                 |
| `assignee`    | `assignee = currentUser()`                       |
| `reporter`    | `reporter = "john.doe"`                          |
| `status`      | `status = "In Progress"`                         |
| `priority`    | `priority = High`                                |
| `issuetype`   | `issuetype = Bug`                                |
| `labels`      | `labels = frontend`                              |
| `summary`     | `summary ~ "login error"`                        |
| `description` | `description ~ "timeout"`                        |
| `created`     | `created >= -7d`                                 |
| `updated`     | `updated >= "2024/01/01"`                        |
| `resolution`  | `resolution = Unresolved` or `resolution = Done` |
| `fixVersion`  | `fixVersion = "v1.2"`                            |
| `component`   | `component = Backend`                            |

### Operators

- `=` — equals
- `!=` — not equals
- `~` — contains (text search)
- `!~` — does not contain
- `>` / `>=` / `<` / `<=` — comparison (dates, numbers)
- `IN` — `status IN ("Open", "In Progress")`
- `NOT IN` — `priority NOT IN (Trivial, Minor)`
- `IS` / `IS NOT` — `resolution IS EMPTY` (unresolved issues)

### Combining Clauses

- `AND` — `project = PROJ AND status != Closed`
- `OR` — `assignee = currentUser() OR reporter = currentUser()`
- `ORDER BY` — `ORDER BY created DESC, priority ASC`
- Parens for grouping — `(status = Open OR status = "In Progress") AND assignee = currentUser()`

### Useful Built-in Functions

- `currentUser()` — the currently authenticated user
- `now()` — current datetime
- `startOfDay()`, `startOfWeek()`, `endOfMonth()` — relative date anchors
- `-1d`, `-1w`, `-1M` — relative offsets

### Common Queries

```
# My open issues
assignee = currentUser() AND resolution = EMPTY

# Issues updated in the last week
updated >= -7d

# Bugs in a project, ordered by priority
project = PROJ AND issuetype = Bug ORDER BY priority DESC, created DESC

# Unresolved high-priority issues assigned to me
assignee = currentUser() AND priority IN (Highest, High) AND resolution = EMPTY

# Issues with a specific label
labels = bug AND status != Closed

# Recently created stories
issuetype = Story AND created >= -14d ORDER BY created DESC
```
