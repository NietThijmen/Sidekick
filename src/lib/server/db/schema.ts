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
		}>(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('message_chatId_idx').on(table.chatId)]
);

export const chatRelations = relations(chat, ({ one, many }) => ({
	user: one(user, {
		fields: [chat.userId],
		references: [user.id]
	}),
	messages: many(message)
}));

export const messageRelations = relations(message, ({ one }) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id]
	})
}));

export * from './auth.schema';
