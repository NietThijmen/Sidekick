import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { chat, message } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	streamText,
	openrouter,
	isStepCount,
	modelMessageSchema,
	type ModelMessage
} from '$lib/server/ai';
import {
	buildSystemPrompt,
	findActiveSkills,
	getToolsForUser,
	loadAllSkills,
	loadSystemPrompt
} from '$lib/server/ai';
import { calculateCost } from '$lib/server/ai/models';
import { z } from 'zod';

const sendMessageSchema = z.object({
	chatId: z.string().uuid('Invalid chat ID'),
	content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long')
});

const MAX_STEPS = 20;

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return error(401, 'Unauthorized');
	}

	const userId = event.locals.user.id;

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return error(400, 'Invalid JSON');
	}

	const parsed = sendMessageSchema.safeParse(body);
	if (!parsed.success) {
		return error(400, parsed.error.issues[0]?.message ?? 'Invalid request');
	}

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
		return error(403, 'Chat not found');
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
	const skills = await loadAllSkills(userId);
	const activeSkills = findActiveSkills(content, skills);

	let systemPrompt = buildSystemPrompt(baseSystemPrompt, activeSkills);

	if (currentChat.agent?.systemPrompt) {
		systemPrompt += `\n\n## Agent: ${currentChat.agent.name}\n\n${currentChat.agent.systemPrompt}`;
	}

	systemPrompt += `\n\n## Context\n\nCurrent chat ID: ${chatId}`;

	const modelId = currentChat.agent?.model || currentChat.model;

	async function saveErrorMessage(err: unknown) {
		let messageText = err instanceof Error ? err.message : 'Failed to generate response';
		if (err instanceof Error && err.cause instanceof Error) {
			messageText += ` (${err.cause.message})`;
		}
		await db.insert(message).values({
			chatId,
			role: 'assistant',
			content: `Sorry, I encountered an error: ${messageText}`
		});
		await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
	}

	try {
		const tools = await getToolsForUser(userId);

		const validationResult = modelMessageSchema.array().safeParse(chatMessages);
		if (!validationResult.success) {
			console.error('Invalid messages:', chatMessages, validationResult.error);
			return error(400, `Invalid messages: ${validationResult.error.message}`);
		}

		let reasoning = '';
		const startTime = performance.now();

		const result = streamText({
			model: openrouter(modelId),
			messages: chatMessages as ModelMessage[],
			system: systemPrompt,
			tools,
			stopWhen: isStepCount(MAX_STEPS),
			onEnd: async ({ text, toolCalls, toolResults, usage }) => {
				const durationMs = performance.now() - startTime;

				const storedToolCalls: Array<{
					id: string;
					type: 'tool-call';
					toolName: string;
					args: Record<string, unknown>;
					result?: unknown;
				}> = [];

				for (let i = 0; i < toolCalls.length; i++) {
					const toolCall = toolCalls[i];
					const toolResult = toolResults.find((r) => r?.toolCallId === toolCall?.toolCallId);
					if (toolCall) {
						storedToolCalls.push({
							id: toolCall.toolCallId,
							type: 'tool-call',
							toolName: toolCall.toolName,
							args: toolCall.input as Record<string, unknown>,
							result: toolResult?.output
						});
					}
				}

				const inputTokens = usage?.inputTokens ?? 0;
				const outputTokens = usage?.outputTokens ?? 0;
				const totalCost = calculateCost(modelId, inputTokens, outputTokens);
				const totalTokens = usage?.totalTokens ?? 0;
				const durationSec = durationMs / 1000;
				const tokensPerSecond = durationSec > 0 ? totalTokens / durationSec : 0;

				await db.insert(message).values({
					chatId,
					role: 'assistant',
					content: text,
					reasoning: reasoning || undefined,
					toolCalls: storedToolCalls.length > 0 ? storedToolCalls : undefined,
					usage: {
						promptTokens: inputTokens,
						completionTokens: outputTokens,
						totalTokens,
						totalCost,
						durationMs,
						tokensPerSecond
					}
				});

				await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
			},
			onError: async ({ error: streamError }) => {
				await saveErrorMessage(streamError);
			}
		});

		const encoder = new TextEncoder();
		const jsonStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const part of result.stream) {
						if (part.type === 'reasoning-delta') {
							reasoning += part.text;
							controller.enqueue(
								encoder.encode(JSON.stringify({ type: 'reasoning', content: part.text }) + '\n')
							);
						} else if (part.type === 'text-delta') {
							controller.enqueue(
								encoder.encode(JSON.stringify({ type: 'content', content: part.text }) + '\n')
							);
						}
					}
					const durationMs = performance.now() - startTime;
					const durationSec = durationMs / 1000;
					const totalTokens = (await result.usage)?.totalTokens ?? 0;
					const tokensPerSecond = durationSec > 0 ? totalTokens / durationSec : 0;
					controller.enqueue(
						encoder.encode(
							JSON.stringify({
								type: 'done',
								durationMs,
								tokensPerSecond
							}) + '\n'
						)
					);
				} catch {
					controller.enqueue(encoder.encode(JSON.stringify({ type: 'error' }) + '\n'));
				} finally {
					controller.close();
				}
			}
		});

		return new Response(jsonStream, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-cache'
			}
		});
	} catch (err) {
		await saveErrorMessage(err);
		return error(500, err instanceof Error ? err.message : 'Failed to generate response');
	}
};
