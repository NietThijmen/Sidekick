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
	import { ArrowLeft, KeyRound, Loader2, LogOut, Shield } from '@lucide/svelte';

	interface AuthFormData {
		error?: string;
		errors?: Record<string, string[]>;
		newEmail?: string;
	}

	let {
		data,
		form
	}: {
		data: {
			email: string;
			emailVerified: boolean;
			accounts: {
				github: boolean;
				atlassian: boolean;
				hasPassword: boolean;
			};
			atlassianConfigured: boolean;
		};
		form: AuthFormData;
	} = $props();

	let isEmailLoading = $state(false);
	let isPasswordLoading = $state(false);
	let isLinkLoading = $state<string | null>(null);
	let isUnlinkLoading = $state<string | null>(null);
	let showEmailSuccess = $state(false);
	let showPasswordSuccess = $state(false);

	async function handleLogout() {
		await fetch('/api/auth/sign-out', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>Authentication</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<header class="border-b">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon-sm"
					href={resolve('/profile')}
					aria-label="Back to profile"
				>
					<ArrowLeft class="size-4" />
				</Button>
				<h1 class="text-lg font-semibold">Authentication</h1>
			</div>
			<Button variant="ghost" size="sm" onclick={handleLogout} class="gap-2">
				<LogOut class="size-4" />
				<span class="hidden sm:inline">Sign out</span>
			</Button>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-8">
		<div class="grid gap-6">
			{#if form?.error && !isPasswordLoading && !isLinkLoading && !isUnlinkLoading}
				<div class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
					{form.error}
				</div>
			{/if}

			{#if showEmailSuccess}
				<div
					class="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
					role="status"
				>
					{#if form?.newEmail}
						Email changed to {form.newEmail}.
					{:else}
						Email updated successfully.
					{/if}
				</div>
			{/if}

			{#if showPasswordSuccess}
				<div
					class="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
					role="status"
				>
					Your password has been updated successfully.
				</div>
			{/if}

			<Card>
				<CardHeader class="pb-4">
					<div class="flex items-center gap-3">
						<div
							class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<svg
								class="size-5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"
							>
								<rect x="2" y="4" width="20" height="16" rx="2" />
								<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
							</svg>
						</div>
						<div>
							<CardTitle class="text-lg">Email</CardTitle>
							<CardDescription>
								{data.email}
								{#if data.emailVerified}
									<span class="text-emerald-600 dark:text-emerald-400">(Verified)</span>
								{:else}
									<span class="text-muted-foreground">(Not verified)</span>
								{/if}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<form
						method="post"
						action="?/changeEmail"
						use:enhance={() => {
							isEmailLoading = true;
							showEmailSuccess = false;
							return async ({ update, result }) => {
								await update();
								isEmailLoading = false;
								if (result.type === 'success') {
									showEmailSuccess = true;
									setTimeout(() => {
										showEmailSuccess = false;
									}, 5000);
								}
							};
						}}
						class="grid gap-4"
					>
						<div class="grid gap-2">
							<Label for="newEmail">New email address</Label>
							<Input
								id="newEmail"
								name="newEmail"
								type="email"
								placeholder="you@example.com"
								required
								disabled={isEmailLoading}
							/>
						</div>
						<div class="flex justify-end pt-2">
							<Button type="submit" disabled={isEmailLoading}>
								{#if isEmailLoading}
									<Loader2 class="mr-2 size-4 animate-spin" />
								{/if}
								Change email
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-4">
					<div class="flex items-center gap-3">
						<div
							class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<KeyRound class="size-5" />
						</div>
						<div>
							<CardTitle class="text-lg">Password</CardTitle>
							<CardDescription>
								{data.accounts.hasPassword
									? 'Update your account password'
									: 'Set a password for your account'}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<form
						method="post"
						action="?/updatePassword"
						use:enhance={() => {
							isPasswordLoading = true;
							showPasswordSuccess = false;
							return async ({ update, result }) => {
								await update();
								isPasswordLoading = false;
								if (result.type === 'success') {
									showPasswordSuccess = true;
									setTimeout(() => {
										showPasswordSuccess = false;
									}, 3000);
								}
							};
						}}
						class="grid gap-4"
					>
						{#if data.accounts.hasPassword}
							<div class="grid gap-2">
								<Label for="currentPassword">Current password</Label>
								<Input
									id="currentPassword"
									name="currentPassword"
									type="password"
									placeholder="Enter your current password"
									required
									disabled={isPasswordLoading}
									aria-invalid={form?.errors?.currentPassword ? 'true' : undefined}
								/>
								{#if form?.errors?.currentPassword}
									<p class="text-sm text-destructive">{form.errors.currentPassword[0]}</p>
								{/if}
							</div>
						{/if}

						<div class="grid gap-2">
							<Label for="newPassword">New password</Label>
							<Input
								id="newPassword"
								name="newPassword"
								type="password"
								placeholder="Enter your new password"
								required
								minlength={8}
								disabled={isPasswordLoading}
								aria-invalid={form?.errors?.newPassword ? 'true' : undefined}
							/>
							{#if form?.errors?.newPassword}
								<p class="text-sm text-destructive">{form.errors.newPassword[0]}</p>
							{/if}
						</div>

						<div class="grid gap-2">
							<Label for="confirmPassword">Confirm new password</Label>
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								placeholder="Confirm your new password"
								required
								minlength={8}
								disabled={isPasswordLoading}
								aria-invalid={form?.errors?.confirmPassword ? 'true' : undefined}
							/>
							{#if form?.errors?.confirmPassword}
								<p class="text-sm text-destructive">{form.errors.confirmPassword[0]}</p>
							{/if}
						</div>

						<div class="flex justify-end pt-2">
							<Button type="submit" disabled={isPasswordLoading}>
								{#if isPasswordLoading}
									<Loader2 class="mr-2 size-4 animate-spin" />
								{/if}
								{data.accounts.hasPassword ? 'Update password' : 'Set password'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-4">
					<div class="flex items-center gap-3">
						<div
							class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<Shield class="size-5" />
						</div>
						<div>
							<CardTitle class="text-lg">Connected accounts</CardTitle>
							<CardDescription>Link your social accounts to sign in faster</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class="grid gap-4">
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path
									d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
								/>
							</svg>
							<div>
								<p class="font-medium">GitHub</p>
								<p class="text-sm text-muted-foreground">
									{data.accounts.github ? 'Connected' : 'Not connected'}
								</p>
							</div>
						</div>
						{#if data.accounts.github}
							<form
								method="post"
								action="?/unlinkSocial"
								use:enhance={() => {
									isUnlinkLoading = 'github';
									return async ({ update }) => {
										await update();
										isUnlinkLoading = null;
									};
								}}
							>
								<input type="hidden" name="provider" value="github" />
								<Button
									type="submit"
									variant="outline"
									size="sm"
									disabled={isUnlinkLoading === 'github'}
								>
									{#if isUnlinkLoading === 'github'}
										<Loader2 class="mr-2 size-4 animate-spin" />
									{/if}
									Disconnect
								</Button>
							</form>
						{:else}
							<form
								method="post"
								action="?/linkSocial"
								use:enhance={() => {
									isLinkLoading = 'github';
									return async ({ update }) => {
										await update();
										isLinkLoading = null;
									};
								}}
							>
								<input type="hidden" name="provider" value="github" />
								<input type="hidden" name="callbackURL" value="/profile/auth" />
								<Button
									type="submit"
									variant="outline"
									size="sm"
									disabled={isLinkLoading === 'github'}
								>
									{#if isLinkLoading === 'github'}
										<Loader2 class="mr-2 size-4 animate-spin" />
									{/if}
									Connect
								</Button>
							</form>
						{/if}
					</div>

					{#if data.atlassianConfigured}
						<Separator />

						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-3">
								<svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path
										d="M19.75 7.4c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1l-2.8 4.47c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2l-2.8-4.47zM12.25 2.6c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1L9.11 7.07c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2L12.25 2.6zM4.75 7.4c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1l-2.8 4.47c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2L4.75 7.4zM12.25 11.07c-.04-.06-.1-.1-.17-.1s-.13.04-.17.1l-2.8 4.47c-.04.06-.04.14 0 .2l2.8 4.47c.04.06.1.1.17.1s.13-.04.17-.1l2.8-4.47c.04-.06.04-.14 0-.2l-2.8-4.47z"
									/>
								</svg>
								<div>
									<p class="font-medium">Atlassian</p>
									<p class="text-sm text-muted-foreground">
										{data.accounts.atlassian ? 'Connected' : 'Not connected'}
									</p>
								</div>
							</div>
							{#if data.accounts.atlassian}
								<form
									method="post"
									action="?/unlinkSocial"
									use:enhance={() => {
										isUnlinkLoading = 'atlassian';
										return async ({ update }) => {
											await update();
											isUnlinkLoading = null;
										};
									}}
								>
									<input type="hidden" name="provider" value="atlassian" />
									<Button
										type="submit"
										variant="outline"
										size="sm"
										disabled={isUnlinkLoading === 'atlassian'}
									>
										{#if isUnlinkLoading === 'atlassian'}
											<Loader2 class="mr-2 size-4 animate-spin" />
										{/if}
										Disconnect
									</Button>
								</form>
							{:else}
								<form
									method="post"
									action="?/linkSocial"
									use:enhance={() => {
										isLinkLoading = 'atlassian';
										return async ({ update }) => {
											await update();
											isLinkLoading = null;
										};
									}}
								>
									<input type="hidden" name="provider" value="atlassian" />
									<input type="hidden" name="callbackURL" value="/profile/auth" />
									<Button
										type="submit"
										variant="outline"
										size="sm"
										disabled={isLinkLoading === 'atlassian'}
									>
										{#if isLinkLoading === 'atlassian'}
											<Loader2 class="mr-2 size-4 animate-spin" />
										{/if}
										Connect
									</Button>
								</form>
							{/if}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	</main>
</div>
