import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { chat, message, agent } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { listModels } from '$lib/server/ai/models';
import { findActiveSkills, loadAllSkills } from '$lib/server/ai';
import { z } from 'zod';

const chatIdSchema = z.string().uuid('Invalid chat ID');

const newChatSchema = z.object({
	title: z.string().max(100, 'Title is too long').default('New chat'),
	agentId: z.string().uuid('Invalid agent ID').optional().or(z.literal(''))
});

const deleteChatSchema = z.object({
	chatId: chatIdSchema
});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const userId = event.locals.user.id;

	const chats = await db.query.chat.findMany({
		where: eq(chat.userId, userId),
		orderBy: [desc(chat.updatedAt)],
		with: {
			agent: {
				columns: {
					id: true,
					name: true,
					description: true,
					model: true
				}
			}
		}
	});

	const selectedChatId = event.params.chatId;
	let currentChat = selectedChatId ? chats.find((c) => c.id === selectedChatId) : chats[0];

	if (!currentChat) {
		if (selectedChatId) {
			return redirect(302, '/chat');
		}

		const [newChat] = await db
			.insert(chat)
			.values({
				userId,
				title: 'New chat'
			})
			.returning();
		currentChat = { ...newChat, agent: null };
		chats.unshift(currentChat);
	}

	const messages = await db.query.message.findMany({
		where: eq(message.chatId, currentChat.id),
		orderBy: [message.createdAt]
	});

	const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
	const allSkills = await loadAllSkills(userId);
	const activeSkills = lastUserMessage ? findActiveSkills(lastUserMessage.content, allSkills) : [];

	const userAgents = await db.query.agent.findMany({
		where: eq(agent.userId, userId),
		orderBy: [desc(agent.updatedAt)],
		columns: {
			id: true,
			name: true,
			description: true,
			model: true
		}
	});

	return {
		user: event.locals.user,
		chats,
		currentChat,
		messages,
		activeSkills,
		models: listModels(),
		agents: userAgents
	};
};

export const actions: Actions = {
	newChat: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = newChatSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid chat title'
			});
		}

		const userId = event.locals.user.id;
		const { title, agentId } = parsed.data;

		let model = 'openai/gpt-5.6-luna';

		if (agentId) {
			const selectedAgent = await db.query.agent.findFirst({
				where: eq(agent.id, agentId)
			});
			if (selectedAgent && selectedAgent.userId === userId) {
				model = selectedAgent.model;
			}
		}

		const [newChat] = await db
			.insert(chat)
			.values({
				userId,
				title: title || 'New chat',
				model,
				agentId: agentId || null
			})
			.returning();

		return redirect(302, `/chat/${newChat.id}`);
	},

	deleteChat: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = deleteChatSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, { error: 'Invalid chat ID' });
		}

		const userId = event.locals.user.id;
		const { chatId } = parsed.data;

		const currentChat = await db.query.chat.findFirst({
			where: eq(chat.id, chatId)
		});

		if (!currentChat || currentChat.userId !== userId) {
			return fail(403, { error: 'Chat not found' });
		}

		await db.delete(chat).where(eq(chat.id, chatId));

		return redirect(302, '/chat');
	},

	setModel: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = z
			.object({
				chatId: chatIdSchema,
				model: z.string().min(1)
			})
			.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid model selection'
			});
		}

		const { chatId, model } = parsed.data;
		const userId = event.locals.user.id;

		const currentChat = await db.query.chat.findFirst({
			where: eq(chat.id, chatId)
		});

		if (!currentChat || currentChat.userId !== userId) {
			return fail(403, { error: 'Chat not found' });
		}

		await db.update(chat).set({ model }).where(eq(chat.id, chatId));

		return { success: true };
	},

	setAgent: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = z
			.object({
				chatId: chatIdSchema,
				agentId: z.string().uuid().optional().or(z.literal(''))
			})
			.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid request'
			});
		}

		const { chatId, agentId } = parsed.data;
		const userId = event.locals.user.id;

		const currentChat = await db.query.chat.findFirst({
			where: eq(chat.id, chatId)
		});

		if (!currentChat || currentChat.userId !== userId) {
			return fail(403, { error: 'Chat not found' });
		}

		if (agentId) {
			const selectedAgent = await db.query.agent.findFirst({
				where: eq(agent.id, agentId)
			});
			if (!selectedAgent || selectedAgent.userId !== userId) {
				return fail(403, { error: 'Agent not found' });
			}
		}

		await db
			.update(chat)
			.set({ agentId: agentId || null })
			.where(eq(chat.id, chatId));

		return { success: true };
	}
};
