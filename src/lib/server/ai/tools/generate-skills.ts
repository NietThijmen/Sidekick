import { tool } from 'ai';
import { getRequestEvent } from '$app/server';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { skill as skillTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const skillTools = {
	createCustomSkill: tool({
		description:
			'Create a new custom skill for the user. Skills provide specialized instructions that activate on trigger words.',
		inputSchema: z.object({
			name: z.string().min(1).max(100).describe('The name of the skill'),
			description: z.string().optional().describe('A short description of what the skill does'),
			triggers: z
				.array(z.string())
				.min(1)
				.describe(
					'Trigger words or phrases. When the user says any of these, the skill instructions are injected.'
				),
			content: z
				.string()
				.min(1)
				.describe(
					'The full instructions for the skill. This is injected into the system prompt when triggered.'
				)
		}),
		execute: async ({
			name,
			description,
			triggers,
			content
		}: {
			name: string;
			description?: string;
			triggers: string[];
			content: string;
		}) => {
			const event = getRequestEvent();

			if (!event.locals.user) {
				return { error: 'User not logged in' };
			}

			const inserted = await db
				.insert(skillTable)
				.values({
					userId: event.locals.user.id,
					name,
					description: description ?? null,
					triggers,
					content
				})
				.returning();

			return {
				skill: inserted[0] ?? null
			};
		}
	} as any),

	editCustomSkill: tool({
		description: 'Edit an existing custom skill owned by the user',
		inputSchema: z.object({
			id: z.string().describe('The ID of the skill to edit'),
			name: z.string().min(1).max(100).optional().describe('The new name of the skill'),
			description: z.string().optional().describe('The new description of the skill'),
			triggers: z.array(z.string()).min(1).optional().describe('The new trigger words or phrases'),
			content: z.string().min(1).optional().describe('The new skill instructions')
		}),
		execute: async ({
			id,
			name,
			description,
			triggers,
			content
		}: {
			id: string;
			name?: string;
			description?: string;
			triggers?: string[];
			content?: string;
		}) => {
			const event = getRequestEvent();

			if (!event.locals.user) {
				return { error: 'User not logged in' };
			}

			const existing = await db.query.skill.findFirst({
				where: eq(skillTable.id, id)
			});

			if (!existing) {
				return { error: 'Skill not found' };
			}

			if (existing.userId !== event.locals.user.id) {
				return { error: 'You do not have permission to edit this skill' };
			}

			const updates: Partial<typeof skillTable.$inferInsert> = {};
			if (name !== undefined) updates.name = name;
			if (description !== undefined) updates.description = description;
			if (triggers !== undefined) updates.triggers = triggers;
			if (content !== undefined) updates.content = content;

			if (Object.keys(updates).length === 0) {
				return { error: 'No fields provided to update' };
			}

			const updated = await db
				.update(skillTable)
				.set(updates)
				.where(eq(skillTable.id, id))
				.returning();

			return {
				skill: updated[0] ?? null
			};
		}
	} as any),

	deleteCustomSkill: tool({
		description: 'Delete a custom skill owned by the user',
		inputSchema: z.object({
			id: z.string().describe('The ID of the skill to delete')
		}),
		execute: async ({ id }: { id: string }) => {
			const event = getRequestEvent();

			if (!event.locals.user) {
				return { error: 'User not logged in' };
			}

			const existing = await db.query.skill.findFirst({
				where: eq(skillTable.id, id)
			});

			if (!existing) {
				return { error: 'Skill not found' };
			}

			if (existing.userId !== event.locals.user.id) {
				return { error: 'You do not have permission to delete this skill' };
			}

			await db.delete(skillTable).where(eq(skillTable.id, id));

			return { deleted: true };
		}
	} as any)
};
