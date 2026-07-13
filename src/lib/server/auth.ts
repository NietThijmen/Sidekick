import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const atlassianConfigured = !!(env.ATLASSIAN_CLIENT_ID && env.ATLASSIAN_CLIENT_SECRET);

const trustedProviders: string[] = ['github'];
if (atlassianConfigured) trustedProviders.push('atlassian');

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true },
	account: {
		accountLinking: {
			trustedProviders: trustedProviders,
			allowDifferentEmails: true
		}
	},
	user: {
		changeEmail: {
			enabled: true,
			updateEmailWithoutVerification: true,
			sendChangeEmailVerification: async ({ user, newEmail, url }) => {
				console.info('[change-email]', { user: user.email, newEmail, url });
			}
		},
		additionalFields: {
			username: {
				type: 'string',
				required: false,
				defaultValue: null
			},
			bio: {
				type: 'string',
				required: false,
				defaultValue: null
			}
		}
	},
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
			scope: ['read:user', 'user:email', 'repo']
		},
		...(atlassianConfigured && {
			atlassian: {
				clientId: env.ATLASSIAN_CLIENT_ID,
				clientSecret: env.ATLASSIAN_CLIENT_SECRET,
				scope: ['read:jira-work', 'read:jira-user', 'write:jira-work', 'read:me', 'read:account']
			}
		})
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
