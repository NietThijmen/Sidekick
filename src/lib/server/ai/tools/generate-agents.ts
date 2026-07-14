import { tool } from 'ai';
import { getRequestEvent } from '$app/server';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import { agent } from '$lib/server/db/schema';

export const agentTools = {
	getAvailableAgents: tool({
		description: 'List all agents the user made',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			const event = getRequestEvent();

			if (!event.locals.user) {
				return {
					error: 'User not logged in'
				};
			}

			const agents = await db.query.agent.findMany({
				where: eq(agent.userId, event.locals.user.id),
				orderBy: [desc(agent.updatedAt)]
			});

			return {
				agents: agents
			};
		}
	} as any),

	createAgent: tool({
		description: 'Create a new custom AI agent for the user',
		inputSchema: z.object({
			name: z.string().min(1).describe('The name of the agent'),
			description: z.string().optional().describe('A short description of what the agent does'),
			systemPrompt: z
				.string()
				.optional()
				.describe('The system prompt that defines the agent behavior'),
			model: z
				.string()
				.optional()
				.describe('The model identifier to use (defaults to openai/gpt-5.6-luna)')
		}),
		execute: async ({
			name,
			description,
			systemPrompt,
			model: modelName
		}: {
			name: string;
			description?: string;
			systemPrompt?: string;
			model?: string;
		}) => {
			const event = getRequestEvent();

			if (!event.locals.user) {
				return {
					error: 'User not logged in'
				};
			}

			const inserted = await db
				.insert(agent)
				.values({
					userId: event.locals.user.id,
					name,
					description: description ?? null,
					systemPrompt: systemPrompt ?? '',
					model: modelName ?? 'openai/gpt-5.6-luna'
				})
				.returning();

			return {
				agent: inserted[0] ?? null
			};
		}
	} as any),

	editAgent: tool({
		description: 'Edit an existing custom AI agent owned by the user',
		inputSchema: z.object({
			id: z.string().describe('The ID of the agent to edit'),
			name: z.string().min(1).optional().describe('The new name of the agent'),
			description: z.string().optional().describe('The new description of the agent'),
			systemPrompt: z.string().optional().describe('The new system prompt for the agent'),
			model: z.string().optional().describe('The new model identifier for the agent')
		}),
		execute: async ({
			id,
			name,
			description,
			systemPrompt,
			model: modelName
		}: {
			id: string;
			name?: string;
			description?: string;
			systemPrompt?: string;
			model?: string;
		}) => {
			const event = getRequestEvent();

			if (!event.locals.user) {
				return {
					error: 'User not logged in'
				};
			}

			const existing = await db.query.agent.findFirst({
				where: eq(agent.id, id)
			});

			if (!existing) {
				return {
					error: 'Agent not found'
				};
			}

			if (existing.userId !== event.locals.user.id) {
				return {
					error: 'You do not have permission to edit this agent'
				};
			}

			const updates: Partial<typeof agent.$inferInsert> = {};
			if (name !== undefined) updates.name = name;
			if (description !== undefined) updates.description = description;
			if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
			if (modelName !== undefined) updates.model = modelName;

			if (Object.keys(updates).length === 0) {
				return {
					error: 'No fields provided to update'
				};
			}

			const updated = await db.update(agent).set(updates).where(eq(agent.id, id)).returning();

			return {
				agent: updated[0] ?? null
			};
		}
	} as any)
};
