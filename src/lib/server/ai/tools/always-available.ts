import { tool } from 'ai';
import { z } from 'zod';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { chat } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { loadAllSkills } from '$lib/server/ai/skills';

export const alwaysAvailableTools = {
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
			const event = getRequestEvent();
			const userId = event.locals.user?.id;
			const skills = await loadAllSkills(userId);
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
			const event = getRequestEvent();
			const userId = event.locals.user?.id;
			const skills = await loadAllSkills(userId);
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

	setChatTitle: tool({
		description:
			'Set the title of a chat conversation. Use this to rename a chat based on the conversation topic.',
		inputSchema: z.object({
			chatId: z.string().uuid().describe('The ID of the chat to rename'),
			title: z.string().min(1).max(100).describe('The new title for the chat')
		}),
		execute: async ({ chatId, title }: { chatId: string; title: string }) => {
			const event = getRequestEvent();
			if (!event.locals.user) {
				return { error: 'User not logged in' };
			}

			const existing = await db
				.select({ id: chat.id, userId: chat.userId })
				.from(chat)
				.where(eq(chat.id, chatId))
				.limit(1);

			if (existing.length === 0) {
				return { error: 'Chat not found' };
			}

			if (existing[0].userId !== event.locals.user.id) {
				return { error: 'Chat does not belong to the current user' };
			}

			await db.update(chat).set({ title }).where(eq(chat.id, chatId));

			return { id: chatId, title };
		}
	} as any)
};
