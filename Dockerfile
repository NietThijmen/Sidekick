# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
WORKDIR /app
ENV DATABASE_URL=file:local.db
ENV BETTER_AUTH_SECRET=placeholder-for-build-only-32chars!!
ENV OPENROUTER_API_KEY=placeholder-for-build-only
ENV GITHUB_CLIENT_ID=placeholder
ENV GITHUB_CLIENT_SECRET=placeholder
ENV ORIGIN=http://localhost:3000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN apk add --no-cache sqlite && \
    DATABASE_URL=file:/tmp/init.db npx drizzle-kit push --force && \
    sqlite3 /tmp/init.db .dump > /tmp/schema.sql && \
    rm /tmp/init.db
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV ORIGIN=http://localhost:3000

RUN apk add --no-cache sqlite

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/static ./static
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /tmp/schema.sql ./schema.sql

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN mkdir -p /data static/generated-images static/generated-videos && \
    chown -R sveltekit:nodejs /data static

USER sveltekit
EXPOSE 3000
CMD ["/docker-entrypoint.sh"]
