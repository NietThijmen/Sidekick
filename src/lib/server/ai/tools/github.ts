import { tool } from 'ai';
import { z } from 'zod';
import { getRequestEvent } from '$app/server';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { auth } from '$lib/server/auth';

async function getGitHubToken(): Promise<string | undefined> {
	const event = getRequestEvent();
	if (!event.locals.user) {
		return privateEnv.GITHUB_TOKEN;
	}

	try {
		const result = await auth.api.getAccessToken({
			body: {
				providerId: 'github',
				userId: event.locals.user.id
			},
			headers: event.request.headers
		});
		return result.accessToken ?? privateEnv.GITHUB_TOKEN;
	} catch {
		return privateEnv.GITHUB_TOKEN;
	}
}

async function githubFetch(path: string) {
	const token = await getGitHubToken();
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': env.PUBLIC_APP_NAME || 'ai-assistant'
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(`https://api.github.com${path}`, { headers });

	if (!response.ok) {
		const text = await response.text();
		return { error: `GitHub API error (${response.status}): ${text}` };
	}

	return response.json();
}

export const gitHubTools = {
	getGitHubRepository: tool({
		description: 'Get information about a GitHub repository',
		inputSchema: z.object({
			owner: z.string().describe('The repository owner (user or organization)'),
			repo: z.string().describe('The repository name')
		}),
		execute: async ({ owner, repo }: { owner: string; repo: string }) => {
			const data = await githubFetch(
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
			);
			if ('error' in data) return data;
			return {
				name: data.full_name,
				description: data.description,
				url: data.html_url,
				stars: data.stargazers_count,
				forks: data.forks_count,
				openIssues: data.open_issues_count,
				language: data.language,
				license: data.license?.name ?? null,
				defaultBranch: data.default_branch,
				createdAt: data.created_at,
				updatedAt: data.updated_at,
				private: data.private,
				topics: data.topics ?? []
			};
		}
	} as any),

	listGitHubPullRequests: tool({
		description: 'List pull requests in a GitHub repository',
		inputSchema: z.object({
			owner: z.string().describe('The repository owner (user or organization)'),
			repo: z.string().describe('The repository name'),
			state: z
				.enum(['open', 'closed', 'all'])
				.optional()
				.default('open')
				.describe('Filter by pull request state'),
			limit: z
				.number()
				.min(1)
				.max(100)
				.optional()
				.default(10)
				.describe('Maximum number of pull requests to return')
		}),
		execute: async ({
			owner,
			repo,
			state,
			limit
		}: {
			owner: string;
			repo: string;
			state: 'open' | 'closed' | 'all';
			limit: number;
		}) => {
			const data = await githubFetch(
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${state}&per_page=${limit}`
			);
			if ('error' in data) return data;
			return (data as any[]).map((pr) => ({
				number: pr.number,
				title: pr.title,
				state: pr.state,
				url: pr.html_url,
				author: pr.user?.login,
				createdAt: pr.created_at,
				updatedAt: pr.updated_at,
				closedAt: pr.closed_at,
				mergedAt: pr.merged_at,
				draft: pr.draft,
				body: pr.body
			}));
		}
	} as any),

	getGitHubPullRequest: tool({
		description: 'Get detailed information about a specific GitHub pull request',
		inputSchema: z.object({
			owner: z.string().describe('The repository owner (user or organization)'),
			repo: z.string().describe('The repository name'),
			pullNumber: z.number().int().positive().describe('The pull request number')
		}),
		execute: async ({
			owner,
			repo,
			pullNumber
		}: {
			owner: string;
			repo: string;
			pullNumber: number;
		}) => {
			const data = await githubFetch(
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`
			);
			if ('error' in data) return data;
			return {
				number: data.number,
				title: data.title,
				state: data.state,
				url: data.html_url,
				author: data.user?.login,
				createdAt: data.created_at,
				updatedAt: data.updated_at,
				closedAt: data.closed_at,
				mergedAt: data.merged_at,
				merged: data.merged,
				mergeable: data.mergeable,
				draft: data.draft,
				baseBranch: data.base?.ref,
				headBranch: data.head?.ref,
				additions: data.additions,
				deletions: data.deletions,
				changedFiles: data.changed_files,
				body: data.body,
				labels: (data.labels ?? []).map((label: any) => label.name)
			};
		}
	} as any),

	listGitHubIssues: tool({
		description: 'List issues in a GitHub repository',
		inputSchema: z.object({
			owner: z.string().describe('The repository owner (user or organization)'),
			repo: z.string().describe('The repository name'),
			state: z
				.enum(['open', 'closed', 'all'])
				.optional()
				.default('open')
				.describe('Filter by issue state'),
			limit: z
				.number()
				.min(1)
				.max(100)
				.optional()
				.default(10)
				.describe('Maximum number of issues to return')
		}),
		execute: async ({
			owner,
			repo,
			state,
			limit
		}: {
			owner: string;
			repo: string;
			state: 'open' | 'closed' | 'all';
			limit: number;
		}) => {
			const data = await githubFetch(
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${state}&per_page=${limit}`
			);
			if ('error' in data) return data;
			return (data as any[])
				.filter((item) => !item.pull_request)
				.map((issue) => ({
					number: issue.number,
					title: issue.title,
					state: issue.state,
					url: issue.html_url,
					author: issue.user?.login,
					createdAt: issue.created_at,
					updatedAt: issue.updated_at,
					closedAt: issue.closed_at,
					comments: issue.comments,
					labels: (issue.labels ?? []).map((label: any) => label.name),
					body: issue.body
				}));
		}
	} as any),

	getGitHubIssue: tool({
		description: 'Get detailed information about a specific GitHub issue',
		inputSchema: z.object({
			owner: z.string().describe('The repository owner (user or organization)'),
			repo: z.string().describe('The repository name'),
			issueNumber: z.number().int().positive().describe('The issue number')
		}),
		execute: async ({
			owner,
			repo,
			issueNumber
		}: {
			owner: string;
			repo: string;
			issueNumber: number;
		}) => {
			const data = await githubFetch(
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`
			);
			if ('error' in data) return data;
			return {
				number: data.number,
				title: data.title,
				state: data.state,
				url: data.html_url,
				author: data.user?.login,
				createdAt: data.created_at,
				updatedAt: data.updated_at,
				closedAt: data.closed_at,
				comments: data.comments,
				labels: (data.labels ?? []).map((label: any) => label.name),
				assignees: (data.assignees ?? []).map((assignee: any) => assignee.login),
				body: data.body
			};
		}
	} as any),

	getUserCommits: tool({
		description:
			'Get recent commits by a GitHub user. Use this when the user asks about their recent activity, what they did today, this week, etc.',
		inputSchema: z.object({
			username: z
				.string()
				.optional()
				.describe('GitHub username. Defaults to the authenticated user if not provided.'),
			since: z
				.string()
				.optional()
				.describe(
					'Only show commits after this date. Use ISO format (2024-01-01), relative days (7d), or "today". Defaults to today.'
				),
			limit: z
				.number()
				.min(1)
				.max(50)
				.optional()
				.default(15)
				.describe('Maximum number of commits to return')
		}),
		execute: async ({
			username,
			since,
			limit
		}: {
			username?: string;
			since?: string;
			limit: number;
		}) => {
			let targetUsername = username;
			if (!targetUsername) {
				const userData = await githubFetch('/user');
				if ('error' in userData) return userData;
				targetUsername = (userData as any).login;
			}
			if (!targetUsername) {
				return { error: 'Could not determine GitHub username' };
			}

			let sinceDate: string;
			if (!since || since === 'today' || since === '1d') {
				const d = new Date();
				d.setHours(0, 0, 0, 0);
				sinceDate = d.toISOString().split('T')[0];
			} else if (/^\d+d$/.test(since)) {
				const days = parseInt(since);
				const d = new Date();
				d.setDate(d.getDate() - days);
				d.setHours(0, 0, 0, 0);
				sinceDate = d.toISOString().split('T')[0];
			} else if (since === 'yesterday') {
				const d = new Date();
				d.setDate(d.getDate() - 1);
				d.setHours(0, 0, 0, 0);
				sinceDate = d.toISOString().split('T')[0];
			} else {
				sinceDate = since;
			}

			const data = await githubFetch(
				`/search/commits?q=author:${encodeURIComponent(targetUsername)}+committer-date:>=${sinceDate}&sort=committer-date&order=desc&per_page=${limit}`
			);
			if ('error' in data) return data;

			const items = (data as any).items ?? [];
			if (items.length === 0) {
				return {
					commits: [],
					message: `No commits found for ${targetUsername} since ${sinceDate}`
				};
			}

			return {
				username: targetUsername,
				since: sinceDate,
				commits: items.map((commit: any) => ({
					repo: commit.repository?.full_name ?? 'unknown',
					message: commit.commit?.message?.split('\n')[0] ?? '',
					date: commit.commit?.committer?.date ?? commit.commit?.author?.date,
					sha: commit.sha?.slice(0, 7),
					url: commit.html_url
				}))
			};
		}
	} as any)
};
