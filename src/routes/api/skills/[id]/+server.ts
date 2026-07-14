import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { skill as skillTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSkillSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().optional(),
	triggers: z.array(z.string()).min(1).optional(),
	content: z.string().min(1).optional(),
	enabled: z.boolean().optional()
});

export const PUT: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return error(401, 'Unauthorized');
	}

	const { id } = event.params;

	const existing = await db.query.skill.findFirst({
		where: eq(skillTable.id, id)
	});

	if (!existing) {
		return error(404, 'Skill not found');
	}

	if (existing.userId !== event.locals.user.id) {
		return error(403, 'You do not have permission to edit this skill');
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return error(400, 'Invalid JSON');
	}

	const parsed = updateSkillSchema.safeParse(body);
	if (!parsed.success) {
		return error(400, parsed.error.issues[0]?.message ?? 'Invalid request');
	}

	const updates: Record<string, unknown> = {};
	if (parsed.data.name !== undefined) updates.name = parsed.data.name;
	if (parsed.data.description !== undefined) updates.description = parsed.data.description;
	if (parsed.data.triggers !== undefined) updates.triggers = parsed.data.triggers;
	if (parsed.data.content !== undefined) updates.content = parsed.data.content;
	if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;

	if (Object.keys(updates).length === 0) {
		return error(400, 'No fields provided to update');
	}

	const updated = await db.update(skillTable).set(updates).where(eq(skillTable.id, id)).returning();

	return json(updated[0] ?? null);
};

export const DELETE: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return error(401, 'Unauthorized');
	}

	const { id } = event.params;

	const existing = await db.query.skill.findFirst({
		where: eq(skillTable.id, id)
	});

	if (!existing) {
		return error(404, 'Skill not found');
	}

	if (existing.userId !== event.locals.user.id) {
		return error(403, 'You do not have permission to delete this skill');
	}

	await db.delete(skillTable).where(eq(skillTable.id, id));

	return json({ deleted: true });
};
