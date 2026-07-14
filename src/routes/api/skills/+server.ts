import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { skill as skillTable } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const createSkillSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	triggers: z.array(z.string()).min(1),
	content: z.string().min(1)
});

export const GET: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return error(401, 'Unauthorized');
	}

	const skills = await db
		.select()
		.from(skillTable)
		.where(eq(skillTable.userId, event.locals.user.id))
		.orderBy(desc(skillTable.updatedAt));

	return json(skills);
};

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return error(401, 'Unauthorized');
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return error(400, 'Invalid JSON');
	}

	const parsed = createSkillSchema.safeParse(body);
	if (!parsed.success) {
		return error(400, parsed.error.issues[0]?.message ?? 'Invalid request');
	}

	const inserted = await db
		.insert(skillTable)
		.values({
			userId: event.locals.user.id,
			name: parsed.data.name,
			description: parsed.data.description ?? null,
			triggers: parsed.data.triggers,
			content: parsed.data.content
		})
		.returning();

	return json(inserted[0] ?? null, { status: 201 });
};
