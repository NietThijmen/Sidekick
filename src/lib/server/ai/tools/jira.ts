import { tool } from 'ai';
import { z } from 'zod';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';

async function getAtlassianToken(): Promise<string | undefined> {
	const event = getRequestEvent();
	if (!event.locals.user) return undefined;

	try {
		const result = await auth.api.getAccessToken({
			body: {
				providerId: 'atlassian',
				userId: event.locals.user.id
			},
			headers: event.request.headers
		});
		return result.accessToken;
	} catch {
		return undefined;
	}
}

let cachedJiraCloudId: string | undefined;

async function getJiraCloudId(token: string): Promise<string | undefined> {
	if (cachedJiraCloudId) return cachedJiraCloudId;
	if (env.ATLASSIAN_CLOUD_ID) {
		cachedJiraCloudId = env.ATLASSIAN_CLOUD_ID;
		return cachedJiraCloudId;
	}
	const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
	});
	if (!res.ok) return undefined;
	const resources = await res.json();
	if (!resources[0]?.id) return undefined;
	cachedJiraCloudId = resources[0].id;
	return cachedJiraCloudId;
}

async function jiraFetch(path: string) {
	const token = await getAtlassianToken();
	if (!token) return { error: 'Atlassian account not linked' };

	const cloudId = await getJiraCloudId(token);
	if (!cloudId) return { error: 'Could not determine Atlassian cloud ID' };

	const response = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		const text = await response.text();
		return { error: `Jira API error (${response.status}): ${text}` };
	}

	return response.json();
}

async function jiraPost(path: string, body: unknown) {
	const token = await getAtlassianToken();
	if (!token) return { error: 'Atlassian account not linked' };

	const cloudId = await getJiraCloudId(token);
	if (!cloudId) return { error: 'Could not determine Atlassian cloud ID' };

	const response = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const text = await response.text();
		return { error: `Jira API error (${response.status}): ${text}` };
	}

	return response.json();
}

export const jiraTools = {
	getJiraIssue: tool({
		description: 'Get details about a Jira issue by its key (e.g. PROJ-123)',
		inputSchema: z.object({
			issueKey: z.string().describe('The Jira issue key, e.g. PROJ-123')
		}),
		execute: async ({ issueKey }: { issueKey: string }) => {
			const data = await jiraFetch(`/issue/${encodeURIComponent(issueKey)}`);
			if ('error' in data) return data;
			const d = data as any;
			return {
				key: d.key,
				summary: d.fields?.summary,
				status: d.fields?.status?.name,
				statusCategory: d.fields?.status?.statusCategory?.name,
				priority: d.fields?.priority?.name,
				assignee: d.fields?.assignee?.displayName,
				reporter: d.fields?.reporter?.displayName,
				project: d.fields?.project?.name,
				issueType: d.fields?.issuetype?.name,
				created: d.fields?.created,
				updated: d.fields?.updated,
				resolution: d.fields?.resolution?.name,
				labels: d.fields?.labels ?? [],
				url: d.self
			};
		}
	} as any),

	searchJiraIssues: tool({
		description: 'Search Jira issues using JQL (Jira Query Language)',
		inputSchema: z.object({
			jql: z.string().describe('JQL query string, e.g. "project = PROJ AND status != Done"'),
			maxResults: z
				.number()
				.min(1)
				.max(50)
				.optional()
				.default(10)
				.describe('Maximum number of results to return')
		}),
		execute: async ({ jql, maxResults }: { jql: string; maxResults: number }) => {
			const data = await jiraPost('/search/jql', {
				jql,
				maxResults,
				fields: ['summary', 'status', 'priority', 'assignee', 'issuetype', 'created']
			});
			if ('error' in data) return data;
			const d = data as any;
			return {
				total: d.total,
				issues: (d.issues ?? []).map((issue: any) => ({
					key: issue.key,
					summary: issue.fields?.summary,
					status: issue.fields?.status?.name,
					priority: issue.fields?.priority?.name,
					assignee: issue.fields?.assignee?.displayName,
					issueType: issue.fields?.issuetype?.name,
					created: issue.fields?.created
				}))
			};
		}
	} as any),

	getJiraProjects: tool({
		description: 'List accessible Jira projects',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			const data = await jiraFetch('/project');
			if ('error' in data) return data;
			const d = data as any[];
			return d.map((p: any) => ({
				key: p.key,
				name: p.name,
				projectTypeKey: p.projectTypeKey,
				style: p.style,
				lead: p.lead?.displayName
			}));
		}
	} as any)
};
