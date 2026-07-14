import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { skill as skillTable } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const skillSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
	description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
	triggers: z.string().min(1, 'At least one trigger is required'),
	content: z.string().min(1, 'Content is required')
});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const skills = await db
		.select()
		.from(skillTable)
		.where(eq(skillTable.userId, event.locals.user.id))
		.orderBy(desc(skillTable.updatedAt));

	return { skills };
};

export const actions: Actions = {
	createSkill: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = skillSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid input',
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const triggers = parsed.data.triggers
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);

		if (triggers.length === 0) {
			return fail(400, { error: 'At least one trigger is required' });
		}

		await db.insert(skillTable).values({
			userId: event.locals.user.id,
			name: parsed.data.name,
			description: parsed.data.description || null,
			triggers,
			content: parsed.data.content
		});

		return { success: true };
	},

	updateSkill: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = z
			.object({
				id: z.string().uuid('Invalid skill ID'),
				...skillSchema.shape
			})
			.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid input',
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const userId = event.locals.user.id;
		const { id, name, description, content } = parsed.data;

		const existing = await db.query.skill.findFirst({
			where: eq(skillTable.id, id)
		});

		if (!existing || existing.userId !== userId) {
			return fail(403, { error: 'Skill not found' });
		}

		const triggers = parsed.data.triggers
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);

		if (triggers.length === 0) {
			return fail(400, { error: 'At least one trigger is required' });
		}

		await db
			.update(skillTable)
			.set({
				name,
				description: description || null,
				triggers,
				content
			})
			.where(eq(skillTable.id, id));

		return { success: true };
	},

	deleteSkill: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = z.object({ id: z.string().uuid('Invalid skill ID') }).safeParse(data);

		if (!parsed.success) {
			return fail(400, { error: 'Invalid skill ID' });
		}

		const userId = event.locals.user.id;
		const { id } = parsed.data;

		const existing = await db.query.skill.findFirst({
			where: eq(skillTable.id, id)
		});

		if (!existing || existing.userId !== userId) {
			return fail(403, { error: 'Skill not found' });
		}

		await db.delete(skillTable).where(eq(skillTable.id, id));

		return { success: true };
	},

	toggleSkill: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = z
			.object({
				id: z.string().uuid('Invalid skill ID'),
				enabled: z.enum(['true', 'false'])
			})
			.safeParse(data);

		if (!parsed.success) {
			return fail(400, { error: 'Invalid request' });
		}

		const userId = event.locals.user.id;
		const { id, enabled } = parsed.data;

		const existing = await db.query.skill.findFirst({
			where: eq(skillTable.id, id)
		});

		if (!existing || existing.userId !== userId) {
			return fail(403, { error: 'Skill not found' });
		}

		await db
			.update(skillTable)
			.set({ enabled: enabled === 'true' })
			.where(eq(skillTable.id, id));

		return { success: true };
	}
};
