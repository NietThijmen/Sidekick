import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { agent } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const agentSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
	description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
	systemPrompt: z.string().max(10000, 'System prompt is too long').optional().or(z.literal('')),
	model: z.string().min(1, 'Model is required')
});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const agents = await db.query.agent.findMany({
		where: eq(agent.userId, event.locals.user.id),
		orderBy: [desc(agent.updatedAt)]
	});

	return { agents };
};

export const actions: Actions = {
	createAgent: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = agentSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid input',
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const userId = event.locals.user.id;
		const { name, description, systemPrompt, model } = parsed.data;

		await db.insert(agent).values({
			userId,
			name,
			description: description || null,
			systemPrompt: systemPrompt || '',
			model
		});

		return { success: true };
	},

	updateAgent: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = z
			.object({
				id: z.string().uuid('Invalid agent ID'),
				...agentSchema.shape
			})
			.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid input',
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const userId = event.locals.user.id;
		const { id, name, description, systemPrompt, model } = parsed.data;

		const existing = await db.query.agent.findFirst({
			where: eq(agent.id, id)
		});

		if (!existing || existing.userId !== userId) {
			return fail(403, { error: 'Agent not found' });
		}

		await db
			.update(agent)
			.set({
				name,
				description: description || null,
				systemPrompt: systemPrompt || '',
				model
			})
			.where(eq(agent.id, id));

		return { success: true };
	},

	deleteAgent: async (event) => {
		if (!event.locals.user) {
			return redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = z.object({ id: z.string().uuid('Invalid agent ID') }).safeParse(data);

		if (!parsed.success) {
			return fail(400, { error: 'Invalid agent ID' });
		}

		const userId = event.locals.user.id;
		const { id } = parsed.data;

		const existing = await db.query.agent.findFirst({
			where: eq(agent.id, id)
		});

		if (!existing || existing.userId !== userId) {
			return fail(403, { error: 'Agent not found' });
		}

		await db.delete(agent).where(eq(agent.id, id));

		return { success: true };
	}
};
