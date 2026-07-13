import { tool } from 'ai';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { apiKey } from '$lib/server/db/auth.schema';
import { and, eq } from 'drizzle-orm';

const SENTRY_BASE = 'https://sentry.io/api/0';

async function getSentryConfig(userId: string): Promise<{ token: string; org: string } | null> {
	try {
		const key = await db.query.apiKey.findFirst({
			where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'sentry')),
			columns: { token: true }
		});
		const token = key?.token ?? env.SENTRY_AUTH_TOKEN;
		const org = env.SENTRY_ORG;
		if (!token || !org) return null;
		return { token, org };
	} catch {
		return null;
	}
}

async function sentryFetch(userId: string, path: string) {
	const config = await getSentryConfig(userId);
	if (!config) {
		return {
			error:
				'Sentry not configured. Add a Sentry API key in your profile settings, or set SENTRY_AUTH_TOKEN and SENTRY_ORG in your .env file.'
		};
	}

	const response = await fetch(`${SENTRY_BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${config.token}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		const text = await response.text();
		return { error: `Sentry API error (${response.status}): ${text}` };
	}

	return response.json();
}

async function sentryFetchWithOrg(userId: string, path: string) {
	const config = await getSentryConfig(userId);
	if (!config) {
		return {
			error:
				'Sentry not configured. Add a Sentry API key in your profile settings, or set SENTRY_AUTH_TOKEN and SENTRY_ORG in your .env file.'
		};
	}

	const response = await fetch(`${SENTRY_BASE}/organizations/${config.org}${path}`, {
		headers: {
			Authorization: `Bearer ${config.token}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		const text = await response.text();
		return { error: `Sentry API error (${response.status}): ${text}` };
	}

	return response.json();
}

export const sentryTools = {
	sentryListProjects: tool({
		description: 'List all Sentry projects the auth token has access to in the configured organization',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const data = await sentryFetchWithOrg(event.locals.user.id, '/projects/');
			if ('error' in data) return data;

			if (!Array.isArray(data)) return { error: 'Unexpected response format' };

			return data.map((p: any) => ({
				id: p.id,
				slug: p.slug,
				name: p.name,
				platform: p.platform,
				status: p.status,
				organization: p.organization?.slug ?? null,
				dateCreated: p.dateCreated,
				isBookmarked: p.isBookmarked,
				color: p.color
			}));
		}
	} as any),

	sentryListIssues: tool({
		description:
			'List issues for a Sentry project by project ID with optional filters. Returns issue summaries with count, level, and title. Get the project ID from sentryListProjects first.',
		inputSchema: z.object({
			projectId: z.string().describe('The numeric project ID from sentryListProjects (e.g. "1")'),
			query: z
				.string()
				.optional()
				.describe('Search query (searches issue titles, stacktrace frames, etc.)'),
			status: z
				.enum(['unresolved', 'resolved', 'ignored'])
				.optional()
				.describe('Filter by status (default: unresolved)'),
			statsPeriod: z
				.string()
				.optional()
				.describe('Time range (e.g. "14d", "24h"). Default: "14d"'),
			limit: z.number().int().min(1).max(100).optional().describe('Max results (default: 20)'),
			sort: z
				.enum(['date', 'freq', 'new', 'priority'])
				.optional()
				.describe('Sort order (default: date)')
		}),
		execute: async ({
			projectId,
			query,
			status,
			statsPeriod,
			limit,
			sort
		}: {
			projectId: string;
			query?: string;
			status?: string;
			statsPeriod?: string;
			limit?: number;
			sort?: string;
		}) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const config = await getSentryConfig(event.locals.user.id);
			if (!config) {
				return {
					error:
						'Sentry not configured. Add a Sentry API key in your profile settings, or set SENTRY_AUTH_TOKEN and SENTRY_ORG in your .env file.'
				};
			}

			const params = new URLSearchParams();
			params.set('project', projectId);
			if (query) params.set('query', query);
			if (status) params.set('status', status);
			params.set('statsPeriod', statsPeriod ?? '14d');
			params.set('limit', String(limit ?? 20));
			if (sort) params.set('sort', sort);

			const data = await sentryFetch(
				event.locals.user.id,
				`/organizations/${config.org}/issues/?${params.toString()}`
			);
			if ('error' in data) return data;

			if (!Array.isArray(data)) return { error: 'Unexpected response format' };

			return data.map((issue: any) => ({
				id: issue.id,
				title: issue.title,
				level: issue.level,
				status: issue.status,
				count: issue.count,
				userCount: issue.userCount,
				firstSeen: issue.firstSeen,
				lastSeen: issue.lastSeen,
				isBookmarked: issue.isBookmarked,
				isSubscribed: issue.isSubscribed,
				isPublic: issue.isPublic,
				permalink: issue.permalink,
				shortId: issue.shortId,
				project: issue.project?.slug ?? projectId,
				culprit: issue.culprit,
				type: issue.type ?? issue.metadata?.type ?? null,
				value: issue.metadata?.value ?? null
			}));
		}
	} as any),

	sentryGetIssue: tool({
		description:
			'Get full details and the latest event (with stack trace) for a specific Sentry issue. Use this to debug errors.',
		inputSchema: z.object({
			issueId: z.string().describe('The numeric Sentry issue ID (e.g. "123456")')
		}),
		execute: async ({ issueId }: { issueId: string }) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const issue = await sentryFetch(
				event.locals.user.id,
				`/issues/${encodeURIComponent(issueId)}/`
			);
			if ('error' in issue) return issue;

			const latestEvent = await sentryFetch(
				event.locals.user.id,
				`/issues/${encodeURIComponent(issueId)}/events/latest/`
			);

			return {
				issue: {
					id: issue.id,
					title: issue.title,
					level: issue.level,
					status: issue.status,
					count: issue.count,
					userCount: issue.userCount,
					firstSeen: issue.firstSeen,
					lastSeen: issue.lastSeen,
					permalink: issue.permalink,
					shortId: issue.shortId,
					project: issue.project?.slug ?? null,
					culprit: issue.culprit,
					type: issue.metadata?.type ?? null,
					value: issue.metadata?.value ?? null,
					annotations: issue.annotations ?? [],
					assignedTo: issue.assignedTo
						? { name: issue.assignedTo.name, email: issue.assignedTo.email }
						: null
				},
				latestEvent: 'error' in latestEvent ? null : latestEvent
			};
		}
	} as any)
};
