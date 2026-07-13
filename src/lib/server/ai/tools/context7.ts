import { tool } from 'ai';
import { z } from 'zod';
import { Context7 } from '@upstash/context7-sdk';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { apiKey } from '$lib/server/db/auth.schema';
import { and, eq } from 'drizzle-orm';

async function getClient(userId: string): Promise<Context7 | null> {
	try {
		const key = await db.query.apiKey.findFirst({
			where: and(eq(apiKey.userId, userId), eq(apiKey.provider, 'context7')),
			columns: { token: true }
		});
		if (!key?.token) return null;
		return new Context7({ apiKey: key.token });
	} catch {
		return null;
	}
}

export const context7Tools = {
	context7SearchLibrary: tool({
		description:
			'Search for a library or framework in the Context7 documentation index. Use this to find the correct library ID before calling context7GetDocs.',
		inputSchema: z.object({
			query: z
				.string()
				.describe('What you want to know about the library (e.g. "how to set up authentication")'),
			libraryName: z
				.string()
				.describe('The name of the library or framework (e.g. "Next.js", "Express", "Tailwind CSS")')
		}),
		execute: async ({ query, libraryName }: { query: string; libraryName: string }) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const client = await getClient(event.locals.user.id);
			if (!client) {
				return {
					error:
						'Context7 API key not configured. Add one in your profile settings under API Keys.'
				};
			}

			try {
				const results = await client.searchLibrary(query, libraryName, { type: 'json' });
				return results.map((lib) => ({
					id: lib.id,
					name: lib.name,
					description: lib.description,
					totalSnippets: lib.totalSnippets,
					trustScore: lib.trustScore,
					benchmarkScore: lib.benchmarkScore,
					versions: lib.versions ?? []
				}));
			} catch (err) {
				return { error: `Context7 search failed: ${err instanceof Error ? err.message : String(err)}` };
			}
		}
	} as any),

	context7GetDocs: tool({
		description:
			'Get documentation context/snippets for a specific library and query. Call context7SearchLibrary first to find the library ID.',
		inputSchema: z.object({
			query: z.string().describe('What you want to know (e.g. "how to set up authentication")'),
			libraryId: z
				.string()
				.describe(
					'The Context7 library ID (e.g. "/vercel/next.js", "/facebook/react"). Get this from context7SearchLibrary first.'
				)
		}),
		execute: async ({ query, libraryId }: { query: string; libraryId: string }) => {
			const event = getRequestEvent();
			if (!event.locals.user) return { error: 'User not logged in' };

			const client = await getClient(event.locals.user.id);
			if (!client) {
				return {
					error:
						'Context7 API key not configured. Add one in your profile settings under API Keys.'
				};
			}

			try {
				const results = await client.getContext(query, libraryId, { type: 'txt' });
				return { documentation: results };
			} catch (err) {
				return { error: `Context7 docs lookup failed: ${err instanceof Error ? err.message : String(err)}` };
			}
		}
	} as any)
};
