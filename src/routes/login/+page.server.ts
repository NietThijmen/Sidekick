import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { z } from 'zod';

const loginSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required')
});

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		return redirect(302, '/chat');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = loginSchema.safeParse(data);

		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				error: 'Please fix the errors below.',
				errors,
				email: data.email?.toString() ?? ''
			});
		}

		try {
			await auth.api.signInEmail({
				body: {
					email: parsed.data.email,
					password: parsed.data.password
				},
				headers: event.request.headers
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid email or password';
			return fail(400, {
				error: message,
				errors: {},
				email: parsed.data.email
			});
		}

		return redirect(302, '/chat');
	},
	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? 'github';
		const callbackURL = formData.get('callbackURL')?.toString() ?? '/chat';

		const result = await auth.api.signInSocial({
			body: {
				provider: provider as 'github',
				callbackURL
			}
		});

		if (result.url) {
			return redirect(302, result.url);
		}
		return fail(400, { error: 'Social sign-in failed', errors: {}, email: '' });
	}
};
