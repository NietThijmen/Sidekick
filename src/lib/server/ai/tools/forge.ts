import { tool } from 'ai';
import { z } from 'zod';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { apiKey } from '$lib/server/db/auth.schema';
import { and, eq } from 'drizzle-orm';

const FORGE_BASE = 'https://forge.laravel.com/api';

async function getForgeToken(userId: string): Promise<string | undefined> {
	try {
		const key = await db.query.apiKey.findFirst({
			where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'laravel-forge')),
			columns: { token: true }
		});
		return key?.token;
	} catch {
		return undefined;
	}
}

function extractJsonApiData(response: unknown): any[] {
	const data = (response as any)?.data;
	if (!data) return [];
	if (Array.isArray(data)) return data;
	return [data];
}

async function forgeFetch(userId: string, path: string) {
	const token = await getForgeToken(userId);
	if (!token) return { error: 'Laravel Forge API key not configured. Add one in your profile settings.' };

	const response = await fetch(`${FORGE_BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json',
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		const text = await response.text();
		return { error: `Laravel Forge API error (${response.status}): ${text}` };
	}

	return response.json();
}

async function forgePost(userId: string, path: string) {
	const token = await getForgeToken(userId);
	if (!token) return { error: 'Laravel Forge API key not configured. Add one in your profile settings.' };

	const response = await fetch(`${FORGE_BASE}${path}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json',
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		const text = await response.text();
		return { error: `Laravel Forge API error (${response.status}): ${text}` };
	}

	return response.json();
}

export const forgeTools = {
	listForgeOrganizations: tool({
		description: 'List all Laravel Forge organizations the user has access to',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const data = await forgeFetch(event.locals.user.id, '/orgs?page[size]=30');
			if ('error' in data) return data;

			const items = extractJsonApiData(data);
			return items.map((item: any) => {
				const a = item.attributes ?? {};
				return {
					id: item.id,
					name: a.name,
					slug: a.slug,
					createdAt: a.created_at,
					updatedAt: a.updated_at
				};
			});
		}
	} as any),

	listForgeServers: tool({
		description: 'List all servers for a Laravel Forge organization',
		inputSchema: z.object({
			organization: z.string().describe('The organization slug (e.g. "my-org")')
		}),
		execute: async ({ organization }: { organization: string }) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const data = await forgeFetch(
				event.locals.user.id,
				`/orgs/${encodeURIComponent(organization)}/servers?page[size]=30`
			);
			if ('error' in data) return data;

			const items = extractJsonApiData(data);
			return items.map((item: any) => {
				const a = item.attributes ?? {};
				return {
					id: a.id ?? item.id,
					name: a.name,
					slug: a.slug,
					type: a.type,
					ipAddress: a.ip_address,
					privateIpAddress: a.private_ip_address,
					size: a.size,
					region: a.region,
					provider: a.provider,
					ubuntuVersion: a.ubuntu_version,
					phpVersion: a.php_version,
					databaseType: a.database_type,
					connectionStatus: a.connection_status,
					isReady: a.is_ready,
					createdAt: a.created_at
				};
			});
		}
	} as any),

	listForgeSites: tool({
		description: 'List sites (projects) for a Laravel Forge organization. Optionally filter by server.',
		inputSchema: z.object({
			organization: z.string().describe('The organization slug (e.g. "my-org")')
		}),
		execute: async ({ organization }: { organization: string }) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const data = await forgeFetch(
				event.locals.user.id,
				`/orgs/${encodeURIComponent(organization)}/sites?page[size]=30`
			);
			if ('error' in data) return data;

			const items = extractJsonApiData(data);
			return items.map((item: any) => {
				const a = item.attributes ?? {};
				const repo = a.repository ?? {};
				return {
					id: item.id,
					name: a.name,
					url: a.url,
					status: a.status,
					appType: a.app_type,
					phpVersion: a.php_version,
					deploymentStatus: a.deployment_status,
					repository: repo.url ?? null,
					repositoryBranch: repo.branch ?? null,
					repositoryProvider: repo.provider ?? null,
					deploymentUrl: a.deployment_url,
					healthcheckUrl: a.healthcheck_url,
					https: a.https,
					webDirectory: a.web_directory,
					rootDirectory: a.root_directory,
					zeroDowntimeDeployments: a.zero_downtime_deployments,
					quickDeploy: a.quick_deploy,
					createdAt: a.created_at
				};
			});
		}
	} as any),

	listForgeDeployments: tool({
		description: 'List recent deployments for a site on Laravel Forge',
		inputSchema: z.object({
			organization: z.string().describe('The organization slug (e.g. "my-org")'),
			server: z.number().int().positive().describe('The server ID'),
			site: z.number().int().positive().describe('The site ID')
		}),
		execute: async ({
			organization,
			server,
			site
		}: {
			organization: string;
			server: number;
			site: number;
		}) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const data = await forgeFetch(
				event.locals.user.id,
				`/orgs/${encodeURIComponent(organization)}/servers/${server}/sites/${site}/deployments?page[size]=20`
			);
			if ('error' in data) return data;

			const items = extractJsonApiData(data);
			return items.map((item: any) => {
				const a = item.attributes ?? {};
				const commit = a.commit ?? {};
				return {
					id: item.id,
					status: a.status,
					type: a.type,
					commitHash: commit.hash ?? null,
					commitAuthor: commit.author ?? null,
					commitMessage: commit.message ?? null,
					commitBranch: commit.branch ?? null,
					startedAt: a.started_at,
					endedAt: a.ended_at,
					createdAt: a.created_at,
					updatedAt: a.updated_at
				};
			});
		}
	} as any),

	createForgeDeployment: tool({
		description: 'Trigger a new deployment for a site on Laravel Forge',
		inputSchema: z.object({
			organization: z.string().describe('The organization slug (e.g. "my-org")'),
			server: z.number().int().positive().describe('The server ID'),
			site: z.number().int().positive().describe('The site ID to deploy')
		}),
		execute: async ({
			organization,
			server,
			site
		}: {
			organization: string;
			server: number;
			site: number;
		}) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const data = await forgePost(
				event.locals.user.id,
				`/orgs/${encodeURIComponent(organization)}/servers/${server}/sites/${site}/deployments`
			);
			if ('error' in data) return data;

			const item = extractJsonApiData(data)[0];
			if (!item) return { error: 'Failed to trigger deployment' };

			const a = item.attributes ?? {};
			const commit = a.commit ?? {};
			return {
				id: item.id,
				status: a.status,
				type: a.type,
				commitHash: commit.hash ?? null,
				commitAuthor: commit.author ?? null,
				commitMessage: commit.message ?? null,
				commitBranch: commit.branch ?? null,
				startedAt: a.started_at,
				createdAt: a.created_at
			};
		}
	} as any)
};
