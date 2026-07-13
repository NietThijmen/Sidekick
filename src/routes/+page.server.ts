import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { chat, message } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateText } from '$lib/server/ai';
import { openrouter } from '$lib/server/ai';
import {
	aiTools,
	buildSystemPrompt,
	findActiveSkills,
	loadSkills,
	loadSystemPrompt
} from '$lib/server/ai';
import { isStepCount, type ModelMessage } from 'ai';
import { z } from 'zod';

const chatIdSchema = z.string().uuid('Invalid chat ID');

const sendMessageSchema = z.object({
	chatId: chatIdSchema,
	content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long')
});

const newChatSchema = z.object({
	title: z.string().max(100, 'Title is too long').default('New chat')
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
		orderBy: [desc(chat.updatedAt)]
	});

	const selectedChatId = event.url.searchParams.get('chat');
	let currentChat = selectedChatId ? chats.find((c) => c.id === selectedChatId) : chats[0];

	if (!currentChat) {
		const [newChat] = await db
			.insert(chat)
			.values({
				userId,
				title: 'New chat'
			})
			.returning();
		currentChat = newChat;
		chats.unshift(currentChat);
	}

	const messages = await db.query.message.findMany({
		where: eq(message.chatId, currentChat.id),
		orderBy: [message.createdAt]
	});

	const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
	const allSkills = loadSkills();
	const activeSkills = lastUserMessage ? findActiveSkills(lastUserMessage.content, allSkills) : [];

	return {
		user: event.locals.user,
		chats,
		currentChat,
		messages,
		activeSkills
	};
};

export const actions: Actions = {
	sendMessage: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = sendMessageSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid message'
			});
		}

		const userId = event.locals.user.id;
		const { chatId, content } = parsed.data;

		const currentChat = await db.query.chat.findFirst({
			where: eq(chat.id, chatId)
		});

		if (!currentChat || currentChat.userId !== userId) {
			return fail(403, { error: 'Chat not found' });
		}

		if (currentChat.title === 'New chat') {
			await db
				.update(chat)
				.set({ title: content.slice(0, 50) })
				.where(eq(chat.id, chatId));
		}

		await db.insert(message).values({
			chatId,
			role: 'user',
			content
		});

		const previousMessages = await db.query.message.findMany({
			where: eq(message.chatId, chatId),
			orderBy: [message.createdAt]
		});

		const chatMessages = previousMessages
			.filter((m) => m.role !== 'system')
			.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content
			}));

		const baseSystemPrompt = loadSystemPrompt();
		const skills = loadSkills();
		const activeSkills = findActiveSkills(content, skills);
		const systemPrompt = buildSystemPrompt(baseSystemPrompt, activeSkills);

		const storedToolCalls: Array<{
			id: string;
			type: 'tool-call';
			toolName: string;
			args: Record<string, unknown>;
			result: unknown;
		}> = [];

		try {
			const MAX_STEPS = 3;
			const response = await generateText({
				model: openrouter('openai/gpt-5.6-luna'),
				messages: chatMessages as ModelMessage[],
				system: systemPrompt,
				tools: aiTools,
				stopWhen: isStepCount(MAX_STEPS)
			});

			const text = response.text;

			for (const toolCall of response.toolCalls) {
				const toolResult = response.toolResults.find((r) => r.toolCallId === toolCall.toolCallId);
				storedToolCalls.push({
					id: toolCall.toolCallId,
					type: 'tool-call',
					toolName: toolCall.toolName,
					args: toolCall.input as Record<string, unknown>,
					result: toolResult?.output
				});
			}

			await db.insert(message).values({
				chatId,
				role: 'assistant',
				content: text,
				toolCalls: storedToolCalls.length > 0 ? storedToolCalls : undefined
			});
		} catch (error) {
			const message_text = error instanceof Error ? error.message : 'Failed to generate response';
			await db.insert(message).values({
				chatId,
				role: 'assistant',
				content: `Sorry, I encountered an error: ${message_text}`
			});
		}

		await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));

		return { success: true };
	},

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

		const [newChat] = await db
			.insert(chat)
			.values({
				userId: event.locals.user.id,
				title: parsed.data.title || 'New chat'
			})
			.returning();

		return redirect(302, `/?chat=${newChat.id}`);
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

		return redirect(302, '/');
	}
};
