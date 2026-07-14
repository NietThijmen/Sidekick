import { db } from '$lib/server/db';
import { account, apiKey } from '$lib/server/db/auth.schema';
import { eq, and } from 'drizzle-orm';
import { alwaysAvailableTools } from './always-available';
import { gitHubTools } from './github';
import { jiraTools } from './jira';
import { forgeTools } from './forge';
import { context7Tools } from './context7';
import { firecrawlTools } from './firecrawl';
import { sentryTools } from './sentry';
import { env } from '$env/dynamic/private';

export function sanitizeToolOutput<T>(value: T): T {
	return JSON.parse(JSON.stringify(value, (_, v) => (v instanceof Date ? v.toISOString() : v)));
}

function sanitizeTools<T extends Record<string, unknown>>(tools: T): T {
	const result = {} as T;
	for (const key in tools) {
		const tool = tools[key] as Record<string, unknown>;
		const originalExecute = tool.execute as (...args: unknown[]) => unknown;
		(result as Record<string, unknown>)[key] = {
			...tool,
			execute: async (...args: unknown[]) => {
				const output = await originalExecute(...args);
				return sanitizeToolOutput(output);
			}
		};
	}
	return result;
}

export async function getToolsForUser(userId: string) {
	const linkedProviders = await db
		.select({ providerId: account.providerId })
		.from(account)
		.where(eq(account.userId, userId));

	const providerIds = linkedProviders.map((a) => a.providerId);

	const forgeKey = await db.query.apiKey.findFirst({
		where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'laravel-forge')),
		columns: { id: true }
	});

	const context7Key = await db.query.apiKey.findFirst({
		where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'context7')),
		columns: { id: true }
	});

	const firecrawlKey = await db.query.apiKey.findFirst({
		where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'firecrawl')),
		columns: { id: true }
	});

	const sentryKey = await db.query.apiKey.findFirst({
		where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'sentry')),
		columns: { id: true }
	});

	return {
		...sanitizeTools(alwaysAvailableTools),
		...(context7Key ? sanitizeTools(context7Tools) : {}),
		...(providerIds.includes('github') ? sanitizeTools(gitHubTools) : {}),
		...(providerIds.includes('atlassian') ? sanitizeTools(jiraTools) : {}),
		...(forgeKey ? sanitizeTools(forgeTools) : {}),
		...(firecrawlKey || env.FIRECRAWL_API_KEY ? sanitizeTools(firecrawlTools) : {}),
		...(sentryKey || (env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG) ? sanitizeTools(sentryTools) : {})
	};
}
