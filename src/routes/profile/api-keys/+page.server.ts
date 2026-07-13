import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apiKey } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { providers } from './providers';
import type { ProviderId } from './providers';

const createSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
	provider: z.string().min(1, 'Provider is required'),
	token: z.string().min(1, 'Token is required').max(2000, 'Token is too long')
});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const keys = await db.query.apiKey.findMany({
		where: eq(apiKey.userId, event.locals.user.id),
		columns: {
			id: true,
			name: true,
			provider: true,
			token: true,
			createdAt: true
		},
		orderBy: (apiKey, { desc }) => [desc(apiKey.createdAt)]
	});

	const maskedKeys = keys.map((k) => ({
		...k,
		token: maskToken(k.token)
	}));

	return {
		providers: providers.map((p) => p),
		keys: maskedKeys
	};
};

export const actions: Actions = {
	create: async (event) => {
		if (!event.locals.user) {
			return fail(401, { error: 'You must be logged in.', success: false });
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = createSchema.safeParse(data);

		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				error: 'Please fix the errors below.',
				errors,
				success: false
			});
		}

		const validProviders = providers.map((p) => p.id);
		if (!validProviders.includes(parsed.data.provider as ProviderId)) {
			return fail(400, {
				error: 'Invalid provider selected.',
				errors: {},
				success: false
			});
		}

		await db.insert(apiKey).values({
			userId: event.locals.user.id,
			name: parsed.data.name,
			provider: parsed.data.provider,
			token: parsed.data.token
		});

		return { success: true, error: undefined, errors: {} };
	},

	delete: async (event) => {
		if (!event.locals.user) {
			return fail(401, { error: 'You must be logged in.', success: false });
		}

		const formData = await event.request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Key ID is required.', success: false });
		}

		const existing = await db.query.apiKey.findFirst({
			where: eq(apiKey.id, id),
			columns: { id: true, userId: true }
		});

		if (!existing || existing.userId !== event.locals.user.id) {
			return fail(404, { error: 'API key not found.', success: false });
		}

		await db.delete(apiKey).where(eq(apiKey.id, id));

		return { success: true, error: undefined, errors: {} };
	}
};

function maskToken(token: string): string {
	if (token.length <= 8) return '••••••••';
	const first = token.slice(0, 4);
	const last = token.slice(-4);
	return `${first}••••••••${last}`;
}
