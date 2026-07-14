<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Loader2 } from '@lucide/svelte';

	interface AuthFormData {
		error?: string;
		errors?: Record<string, string[]>;
		email?: string;
	}

	let {
		data,
		form
	}: {
		data: { atlassianConfigured: boolean };
		form: AuthFormData;
	} = $props();
	let isLoading = $state(false);
	let isSocialLoading = $state(false);
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4 py-12">
	<Card class="w-full max-w-sm">
		<CardHeader class="text-center">
			<CardTitle class="text-xl">Welcome back</CardTitle>
			<CardDescription
				>Login with your email{data.atlassianConfigured
					? ', GitHub or Atlassian'
					: ' or GitHub'}{' '}
				account</CardDescription
			>
		</CardHeader>
		<CardContent class="grid gap-4">
			{#if form?.error}
				<div class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
					{form.error}
				</div>
			{/if}

			<form
				method="post"
				action="?/signInSocial"
				use:enhance={() => {
					isSocialLoading = true;
					return async ({ update }) => {
						await update();
						isSocialLoading = false;
					};
				}}
			>
				<input type="hidden" name="provider" value="github" />
				<input type="hidden" name="callbackURL" value="/" />
				<Button
					type="submit"
					variant="outline"
					class="w-full"
					disabled={isSocialLoading || isLoading}
				>
					{#if isSocialLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{:else}
						<svg class="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path
								d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
							/>
						</svg>
					{/if}
					Continue with GitHub
				</Button>
			</form>

			{#if data.atlassianConfigured}
				<form
					method="post"
					action="?/signInSocial"
					use:enhance={() => {
						isSocialLoading = true;
						return async ({ update }) => {
							await update();
							isSocialLoading = false;
						};
					}}
				>
					<input type="hidden" name="provider" value="atlassian" />
					<input type="hidden" name="callbackURL" value="/" />
					<Button
						type="submit"
						variant="outline"
						class="w-full"
						disabled={isSocialLoading || isLoading}
					>
						{#if isSocialLoading}
							<Loader2 class="mr-2 size-4 animate-spin" />
						{:else}
							<svg class="mr-2 size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path
									d="M19.75 7.4c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1l-2.8 4.47c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2l-2.8-4.47zM12.25 2.6c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1L9.11 7.07c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2L12.25 2.6zM4.75 7.4c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1l-2.8 4.47c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2L4.75 7.4zM12.25 11.07c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1l-2.8 4.47c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2l-2.8-4.47z"
								/>
							</svg>
						{/if}
						Continue with Atlassian
					</Button>
				</form>
			{/if}

			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<Separator />
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-card text-muted-foreground px-2">Or continue with email</span>
				</div>
			</div>

			<form
				method="post"
				action="?/login"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						await update();
						isLoading = false;
					};
				}}
				class="grid gap-4"
			>
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="name@example.com"
						value={form?.email ?? ''}
						required
						aria-invalid={form?.errors?.email ? 'true' : undefined}
					/>
					{#if form?.errors?.email}
						<p class="text-sm text-destructive">{form.errors.email[0]}</p>
					{/if}
				</div>
				<div class="grid gap-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						placeholder="Enter your password"
						required
						aria-invalid={form?.errors?.password ? 'true' : undefined}
					/>
					{#if form?.errors?.password}
						<p class="text-sm text-destructive">{form.errors.password[0]}</p>
					{/if}
				</div>
				<Button type="submit" class="w-full" disabled={isLoading || isSocialLoading}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{/if}
					Login
				</Button>
			</form>

			<p class="text-center text-sm text-muted-foreground">
				Don't have an account?
				<a href={resolve('/register')} class="text-primary hover:underline">Register</a>
			</p>
		</CardContent>
	</Card>
</div>
