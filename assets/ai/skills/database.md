---
name: database
description: Help with Drizzle ORM, SQLite schema design, and migrations
triggers:
  - database
  - drizzle
  - schema
  - migration
  - table
  - sqlite
  - column
  - relation
---

When activated, focus on database design and Drizzle ORM usage.

- Use `drizzle-orm/sqlite-core` for table definitions.
- Add indexes for foreign keys and frequently queried columns.
- Define Drizzle relations for query convenience.
- Generate migrations with `pnpm db:generate` and apply with `pnpm db:migrate`.
- Keep schema files in `src/lib/server/db/`.
