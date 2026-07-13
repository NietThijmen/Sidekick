import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { chat, message, agent } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateText } from '$lib/server/ai';
import { openrouter } from '$lib/server/ai';
import {
	buildSystemPrompt,
	findActiveSkills,
	getToolsForUser,
	loadSkills,
	loadSystemPrompt
} from '$lib/server/ai';
import { calculateCost, listModels } from '$lib/server/ai/models';
import { isStepCount, type ModelMessage } from 'ai';
import { z } from 'zod';

const chatIdSchema = z.string().uuid('Invalid chat ID');

const sendMessageSchema = z.object({
	chatId: chatIdSchema,
	content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long')
});

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
	const allSkills = loadSkills();
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
			where: eq(chat.id, chatId),
			with: {
				agent: {
					columns: {
						id: true,
						name: true,
						systemPrompt: true,
						model: true
					}
				}
			}
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

		let baseSystemPrompt = loadSystemPrompt();
		const skills = loadSkills();
		const activeSkills = findActiveSkills(content, skills);

		let systemPrompt = buildSystemPrompt(baseSystemPrompt, activeSkills);

		if (currentChat.agent?.systemPrompt) {
			systemPrompt += `\n\n## Agent: ${currentChat.agent.name}\n\n${currentChat.agent.systemPrompt}`;
		}

		systemPrompt += `\n\n## Context\n\nCurrent chat ID: ${chatId}`;

		const storedToolCalls: Array<{
			id: string;
			type: 'tool-call';
			toolName: string;
			args: Record<string, unknown>;
			result: unknown;
		}> = [];

		const modelId = currentChat.agent?.model || currentChat.model;

		try {
			const MAX_STEPS = 20;
			const tools = await getToolsForUser(userId);
			const response = await generateText({
				model: openrouter(modelId),
				messages: chatMessages as ModelMessage[],
				system: systemPrompt,
				tools,
				stopWhen: isStepCount(MAX_STEPS)
			});

			const text = response.text;

			const toolCalls = response.toolCalls ?? [];
			const toolResults = response.toolResults ?? [];
			for (let i = 0; i < toolCalls.length; i++) {
				const tc = toolCalls[i];
				const tr = toolResults.find((r) => r?.toolCallId === tc?.toolCallId);
				if (tc) {
					storedToolCalls.push({
						id: tc.toolCallId,
						type: 'tool-call',
						toolName: tc.toolName,
						args: tc.input as Record<string, unknown>,
						result: tr?.output
					});
				}
			}

			const inputTokens = response.usage?.inputTokens ?? 0;
			const outputTokens = response.usage?.outputTokens ?? 0;
			const totalCost = calculateCost(modelId, inputTokens, outputTokens);

			const usage = {
				promptTokens: inputTokens,
				completionTokens: outputTokens,
				totalTokens: response.usage?.totalTokens ?? 0,
				totalCost
			};

			await db.insert(message).values({
				chatId,
				role: 'assistant',
				content: text,
				toolCalls: storedToolCalls.length > 0 ? storedToolCalls : undefined,
				usage
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
