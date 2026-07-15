import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import { user } from './auth.schema';

export const task = sqliteTable('task', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const skill = sqliteTable(
	'skill',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		triggers: text('triggers', { mode: 'json' }).$type<string[]>().notNull().default([]),
		content: text('content').notNull().default(''),
		enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('skill_userId_idx').on(table.userId)]
);

export const agent = sqliteTable(
	'agent',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		systemPrompt: text('system_prompt').notNull().default(''),
		model: text('model').notNull().default('openai/gpt-5.6-luna'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('agent_userId_idx').on(table.userId)]
);

export const chat = sqliteTable(
	'chat',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull().default('New chat'),
		model: text('model').notNull().default('openai/gpt-5.6-luna'),
		agentId: text('agent_id').references(() => agent.id, { onDelete: 'set null' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('chat_userId_idx').on(table.userId)]
);

export const message = sqliteTable(
	'message',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		chatId: text('chat_id')
			.notNull()
			.references(() => chat.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
		content: text('content').notNull(),
		reasoning: text('reasoning'),
		toolCalls: text('tool_calls', { mode: 'json' }).$type<
			Array<{
				id: string;
				type: 'tool-call';
				toolName: string;
				args: Record<string, unknown>;
				result?: unknown;
			}>
		>(),
		usage: text('usage', { mode: 'json' }).$type<{
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
			totalCost?: number;
			durationMs?: number;
			tokensPerSecond?: number;
		}>(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('message_chatId_idx').on(table.chatId)]
);

export const skillRelations = relations(skill, ({ one }) => ({
	user: one(user, {
		fields: [skill.userId],
		references: [user.id]
	})
}));

export const agentRelations = relations(agent, ({ one, many }) => ({
	user: one(user, {
		fields: [agent.userId],
		references: [user.id]
	}),
	chats: many(chat)
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
	user: one(user, {
		fields: [chat.userId],
		references: [user.id]
	}),
	messages: many(message),
	agent: one(agent, {
		fields: [chat.agentId],
		references: [agent.id]
	})
}));

export const messageRelations = relations(message, ({ one }) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id]
	})
}));

export * from './auth.schema';
