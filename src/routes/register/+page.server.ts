import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { z } from 'zod';

const registerSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	register: async (event) => {
		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = registerSchema.safeParse(data);

		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				error: 'Please fix the errors below.',
				errors,
				name: data.name?.toString() ?? '',
				email: data.email?.toString() ?? ''
			});
		}

		try {
			await auth.api.signUpEmail({
				body: {
					name: parsed.data.name,
					email: parsed.data.email,
					password: parsed.data.password
				},
				headers: event.request.headers
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to create account';
			return fail(400, {
				error: message,
				errors: {},
				name: parsed.data.name,
				email: parsed.data.email
			});
		}

		return redirect(302, '/');
	},
	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? 'github';
		const callbackURL = formData.get('callbackURL')?.toString() ?? '/';

		const result = await auth.api.signInSocial({
			body: {
				provider: provider as 'github',
				callbackURL
			}
		});

		if (result.url) {
			return redirect(302, result.url);
		}
		return fail(400, { error: 'Social sign-in failed', errors: {}, name: '', email: '' });
	}
};
