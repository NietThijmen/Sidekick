import { tool } from 'ai';
import { z } from 'zod';
import FirecrawlApp from 'firecrawl';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { apiKey } from '$lib/server/db/auth.schema';
import { and, eq } from 'drizzle-orm';

async function getClient(userId: string): Promise<FirecrawlApp | null> {
	try {
		const key = await db.query.apiKey.findFirst({
			where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'firecrawl')),
			columns: { token: true }
		});
		const apiKeyValue = key?.token ?? env.FIRECRAWL_API_KEY;
		if (!apiKeyValue) return null;
		return new FirecrawlApp({ apiKey: apiKeyValue });
	} catch {
		return null;
	}
}

export const firecrawlTools = {
	firecrawlScrapeUrl: tool({
		description:
			'Scrape a URL and return its content as markdown. Use this to fetch and extract content from web pages.',
		inputSchema: z.object({
			url: z.string().url().describe('The URL to scrape'),
			formats: z
				.array(z.enum(['markdown', 'html', 'rawHtml', 'screenshot', 'links']))
				.optional()
				.describe('Output formats to return (default: ["markdown"])')
		}),
		execute: async ({ url, formats }: { url: string; formats?: string[] }) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const client = await getClient(event.locals.user.id);
			if (!client) {
				return {
					error:
						'Firecrawl API key not configured. Add one in your profile settings under API Keys, or set FIRECRAWL_API_KEY in your .env file.'
				};
			}

			try {
				const result = await client.scrapeUrl(url, { formats: (formats ?? ['markdown']) as any });
				return result;
			} catch (err) {
				return {
					error: `Firecrawl scrape failed: ${err instanceof Error ? err.message : String(err)}`
				};
			}
		}
	} as any),

	firecrawlSearch: tool({
		description:
			'Search the web using Firecrawl and return search results with page content. Use this for web searches that need actual page content rather than just snippets.',
		inputSchema: z.object({
			query: z.string().min(1).describe('The search query'),
			limit: z.number().int().min(1).max(20).optional().describe('Number of results (default: 5)'),
			scrapeOptions: z
				.object({
					formats: z
						.array(z.enum(['markdown', 'html', 'rawHtml', 'screenshot', 'links']))
						.optional()
				})
				.optional()
				.describe('Options for scraping each search result')
		}),
		execute: async ({
			query,
			limit,
			scrapeOptions
		}: {
			query: string;
			limit?: number;
			scrapeOptions?: Record<string, unknown>;
		}) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const client = await getClient(event.locals.user.id);
			if (!client) {
				return {
					error:
						'Firecrawl API key not configured. Add one in your profile settings under API Keys, or set FIRECRAWL_API_KEY in your .env file.'
				};
			}

			try {
				const result = await client.search(query, {
					limit: limit ?? 5,
					scrapeOptions: scrapeOptions as any
				});
				return result;
			} catch (err) {
				return {
					error: `Firecrawl search failed: ${err instanceof Error ? err.message : String(err)}`
				};
			}
		}
	} as any)
};
