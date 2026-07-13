/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from 'ai';
import { z } from 'zod';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { loadSkills } from './skills';

async function githubFetch(path: string) {
	const token = env.GITHUB_TOKEN;
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'ai-assistant'
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

export const aiTools = {
	getCurrentTime: tool({
		description: 'Get the current date and time in ISO format',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			return { currentTime: new Date().toISOString() };
		}
	} as any),

	listAvailableSkills: tool({
		description: 'List all available skills that can be activated by trigger words',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			const skills = loadSkills();
			return skills.map((skill) => ({
				name: skill.name,
				description: skill.description,
				triggers: skill.triggers
			}));
		}
	} as any),

	getCurrentUser: tool({
		description: 'Get information about the current user',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			const event = getRequestEvent();

			if (!event.locals.user) {
				return {
					error: 'User not logged in'
				};
			}

			return event.locals.user;
		}
	} as any),

	loadSkill: tool({
		description: 'Load the full content of a skill by its name',
		inputSchema: z.object({
			name: z.string().describe('The name of the skill to load')
		}),
		execute: async ({ name }: { name: string }) => {
			if (!name || typeof name !== 'string') {
				return { error: 'Missing or invalid skill name' };
			}
			const skills = loadSkills();
			const normalized = name.toLowerCase();
			const skill = skills.find(
				(s) => s.name.toLowerCase() === normalized || s.id.toLowerCase() === normalized
			);
			if (!skill) {
				return { error: `Skill "${name}" not found` };
			}
			return {
				name: skill.name,
				description: skill.description,
				content: skill.content
			};
		}
	} as any),

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
	} as any)
} as const;
