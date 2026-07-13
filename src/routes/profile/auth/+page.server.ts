import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth, atlassianConfigured } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

interface RedirectError {
	status: number;
	location: string;
}

function isRedirectError(error: unknown): error is RedirectError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'status' in error &&
		'location' in error &&
		typeof (error as RedirectError).location === 'string'
	);
}

function getAuthError(error: unknown): { message: string; details: Record<string, unknown> } {
	const apiError = error as Record<string, unknown>;
	const details = {
		status: apiError.status,
		statusCode: apiError.statusCode,
		body: apiError.body,
		message: apiError.message
	};
	const message =
		(apiError.body as { message?: string } | undefined)?.message ??
		(apiError.message as string | undefined) ??
		'An unexpected error occurred';
	return { message, details };
}

const updatePasswordSchema = (requiresCurrentPassword: boolean) =>
	z
		.object({
			currentPassword: requiresCurrentPassword
				? z.string().min(1, 'Current password is required')
				: z.string().optional(),
			newPassword: z.string().min(8, 'Password must be at least 8 characters'),
			confirmPassword: z.string().min(1, 'Please confirm your new password')
		})
		.refine((data) => data.newPassword === data.confirmPassword, {
			message: 'Passwords do not match',
			path: ['confirmPassword']
		});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const accounts = await db.query.account.findMany({
		where: eq(account.userId, event.locals.user.id),
		columns: {
			providerId: true,
			accountId: true,
			password: true
		}
	});

	const connectedProviders = new Set(accounts.map((a) => a.providerId));
	const hasPassword = accounts.some((a) => a.password);
	const oauthError = event.url.searchParams.get('error');
	const oauthErrorDescription = event.url.searchParams.get('error_description');

	return {
		email: event.locals.user.email,
		emailVerified: event.locals.user.emailVerified,
		accounts: {
			github: connectedProviders.has('github'),
			atlassian: connectedProviders.has('atlassian'),
			hasPassword
		},
		atlassianConfigured,
		oauthError: oauthError ? (oauthErrorDescription ?? oauthError) : undefined
	};
};

export const actions: Actions = {
	updatePassword: async (event) => {
		if (!event.locals.user) {
			return fail(401, {
				error: 'You must be logged in to update your password.',
				success: false
			});
		}

		const userId = event.locals.user.id;
		const accounts = await db.query.account.findMany({
			where: eq(account.userId, userId),
			columns: { password: true }
		});
		const hasPassword = accounts.some((a) => a.password != null);

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = updatePasswordSchema(hasPassword).safeParse(data);

		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				error: 'Please fix the errors below.',
				errors,
				success: false
			});
		}

		try {
			if (hasPassword) {
				await auth.api.changePassword({
					body: {
						currentPassword: parsed.data.currentPassword!,
						newPassword: parsed.data.newPassword
					},
					headers: event.request.headers
				});
			} else {
				await auth.api.setPassword({
					body: {
						newPassword: parsed.data.newPassword
					},
					headers: event.request.headers
				});
			}
		} catch (error) {
			const { message } = getAuthError(error);
			return fail(400, {
				error: message,
				errors: {},
				success: false
			});
		}

		return {
			success: true,
			error: undefined,
			errors: {}
		};
	},
	linkSocial: async (event) => {
		if (!event.locals.user) {
			return fail(401, { error: 'You must be logged in.' });
		}

		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? 'github';
		const callbackURL = formData.get('callbackURL')?.toString() ?? '/profile/auth';

		try {
			const body = {
				provider: provider as 'github' | 'atlassian',
				callbackURL,
				disableRedirect: true
			};

			console.info(`[linkSocial:${provider}] body`, body);

			const result = await auth.api.linkSocialAccount({
				body: body,
				headers: event.request.headers
			});

			console.info(`[linkSocial:${provider}] result`, result);

			const url =
				(result as { response?: { url?: string } }).response?.url ??
				(result as { url?: string }).url;

			if (url) {
				return redirect(302, url);
			}
		} catch (error) {
			if (isRedirectError(error)) {
				return redirect(error.status, error.location);
			}
			const { message } = getAuthError(error);
			console.error(`[linkSocial:${provider}] failed`, error);
			return fail(400, {
				error: `Failed to link ${provider}: ${message}`
			});
		}

		return fail(400, { error: `Failed to link ${provider}: no redirect URL returned` });
	},
	unlinkSocial: async (event) => {
		if (!event.locals.user) {
			return fail(401, { error: 'You must be logged in.' });
		}

		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? 'github';

		try {
			await auth.api.unlinkAccount({
				body: {
					providerId: provider
				},
				headers: event.request.headers
			});
		} catch (error) {
			const { message } = getAuthError(error);
			return fail(400, { error: message });
		}

		return {
			success: true,
			error: undefined
		};
	},
	changeEmail: async (event) => {
		if (!event.locals.user) {
			return fail(401, { error: 'You must be logged in.', success: false });
		}

		const formData = await event.request.formData();
		const newEmail = formData.get('newEmail')?.toString();

		if (!newEmail) {
			return fail(400, { error: 'Email is required.', success: false });
		}

		try {
			await auth.api.changeEmail({
				body: {
					newEmail
				},
				headers: event.request.headers
			});
		} catch (error) {
			const { message } = getAuthError(error);
			return fail(400, { error: message, success: false });
		}

		return {
			success: true,
			error: undefined,
			newEmail
		};
	}
};
