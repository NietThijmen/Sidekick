import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq, and, not } from 'drizzle-orm';
import { z } from 'zod';

const profileSchema = z.object({
	name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long'),
	username: z
		.string()
		.max(50, 'Username must be 50 characters or less')
		.regex(
			/^[a-zA-Z0-9_-]*$/,
			'Username can only contain letters, numbers, underscores, and hyphens'
		)
		.optional()
		.or(z.literal('')),
	bio: z.string().max(500, 'Bio must be 500 characters or less').optional().or(z.literal('')),
	image: z
		.string()
		.max(500, 'Avatar URL is too long')
		.url('Please enter a valid URL')
		.optional()
		.or(z.literal(''))
});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const profile = await db.query.user.findFirst({
		where: eq(user.id, event.locals.user.id),
		columns: {
			id: true,
			name: true,
			email: true,
			image: true,
			username: true,
			bio: true,
			createdAt: true
		}
	});

	if (!profile) {
		return redirect(302, '/login');
	}

	return {
		profile: {
			id: profile.id,
			name: profile.name,
			email: profile.email,
			image: profile.image,
			username: profile.username,
			bio: profile.bio,
			createdAt: profile.createdAt
		}
	};
};

export const actions: Actions = {
	updateProfile: async (event) => {
		if (!event.locals.user) {
			return fail(401, {
				error: 'You must be logged in to update your profile.',
				errors: {},
				values: {
					name: '',
					username: '',
					bio: '',
					image: ''
				},
				success: false
			});
		}

		const formData = await event.request.formData();
		const data = Object.fromEntries(formData);
		const parsed = profileSchema.safeParse(data);

		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				error: 'Please fix the errors below.',
				errors,
				values: {
					name: data.name?.toString() ?? '',
					username: data.username?.toString() ?? '',
					bio: data.bio?.toString() ?? '',
					image: data.image?.toString() ?? ''
				},
				success: false
			});
		}

		const userId = event.locals.user.id;
		const { name, username, bio, image } = parsed.data;

		if (username) {
			const normalizedUsername = username.toLowerCase();
			const existing = await db.query.user.findFirst({
				where: and(eq(user.username, normalizedUsername), not(eq(user.id, userId))),
				columns: { id: true }
			});

			if (existing) {
				return fail(400, {
					error: 'This username is already taken.',
					errors: { username: ['This username is already taken.'] },
					values: {
						name,
						username,
						bio,
						image
					},
					success: false
				});
			}
		}

		try {
			await db
				.update(user)
				.set({
					name,
					username: username?.toLowerCase() || null,
					bio: bio || null,
					image: image || null
				})
				.where(eq(user.id, userId));
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to update profile';
			return fail(500, {
				error: message,
				errors: {},
				values: {
					name,
					username,
					bio,
					image
				},
				success: false
			});
		}

		return {
			success: true,
			error: undefined,
			errors: {},
			values: {
				name,
				username: username?.toLowerCase() || '',
				bio: bio || '',
				image: image || ''
			}
		};
	}
};
