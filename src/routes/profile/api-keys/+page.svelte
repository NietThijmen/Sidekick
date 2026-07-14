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
	import { invalidateAll } from '$app/navigation';
	import { ArrowLeft, KeyRound, Loader2, LogOut, Trash2 } from '@lucide/svelte';
	import { providerLabels } from './providers';

	interface KeyData {
		id: string;
		name: string;
		provider: string;
		token: string;
		createdAt: Date | number;
	}

	interface Provider {
		id: string;
		label: string;
	}

	interface PageData {
		providers: Provider[];
		keys: KeyData[];
	}

	interface ApiKeysFormData {
		error?: string;
		errors?: Record<string, string[]>;
		success?: boolean;
	}

	let {
		data,
		form
	}: {
		data: PageData;
		form: ApiKeysFormData;
	} = $props();

	let showAddForm = $state(false);
	let isSubmitting = $state(false);
	let showSuccess = $state(false);
	let deletingId = $state<string | null>(null);

	let name = $state('');
	let provider = $state('laravel-forge');
	let token = $state('');

	function resetForm() {
		name = '';
		provider = 'laravel-forge';
		token = '';
	}

	function closeForm() {
		resetForm();
		showAddForm = false;
	}

	function flashSuccess() {
		showSuccess = true;
		setTimeout(() => {
			showSuccess = false;
		}, 3000);
	}

	function formatDate(date: Date | number) {
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function handleLogout() {
		await fetch('/api/auth/sign-out', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>API Keys</title>
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
				<h1 class="text-lg font-semibold">API Keys</h1>
			</div>
			<Button variant="ghost" size="sm" onclick={handleLogout} class="gap-2">
				<LogOut class="size-4" />
				<span class="hidden sm:inline">Sign out</span>
			</Button>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-8">
		<div class="grid gap-6">
			{#if form?.error && !isSubmitting}
				<div class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
					{form.error}
				</div>
			{/if}

			{#if showSuccess}
				<div
					class="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
					role="status"
				>
					API key saved successfully.
				</div>
			{/if}

			<Card>
				<CardHeader class="pb-4">
					<div class="flex items-center gap-3">
						<div
							class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<KeyRound class="size-5" />
						</div>
						<div>
							<CardTitle class="text-lg">API Keys</CardTitle>
							<CardDescription>
								Store bearer tokens for external services like Laravel Forge
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class="grid gap-4">
					{#if data.keys.length === 0 && !showAddForm}
						<p class="py-4 text-center text-sm text-muted-foreground">
							No API keys configured yet.
						</p>
					{/if}

					{#each data.keys as key (key.id)}
						<div class="flex items-center justify-between gap-4 rounded-lg border p-3">
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium">{key.name}</p>
								<p class="text-xs text-muted-foreground">
									{providerLabels[key.provider] ?? key.provider}
									&middot; {key.token}
									&middot; Added {formatDate(key.createdAt)}
								</p>
							</div>
							<form
								method="post"
								action="?/delete"
								use:enhance={() => {
									deletingId = key.id;
									return async ({ update, result }) => {
										await update();
										if (result.type === 'success') {
											await invalidateAll();
										}
										deletingId = null;
									};
								}}
							>
								<input type="hidden" name="id" value={key.id} />
								<Button
									type="submit"
									variant="ghost"
									size="icon-sm"
									disabled={deletingId === key.id}
									aria-label="Delete {key.name}"
								>
									{#if deletingId === key.id}
										<Loader2 class="size-4 animate-spin" />
									{:else}
										<Trash2 class="size-4 text-destructive" />
									{/if}
								</Button>
							</form>
						</div>
					{/each}

					<form
						method="post"
						action="?/create"
						class="grid gap-4 rounded-lg border p-4"
						class:hidden={!showAddForm}
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update, result }) => {
								await update();
								if (result.type === 'success') {
									closeForm();
									flashSuccess();
									await invalidateAll();
								} else {
									isSubmitting = false;
								}
							};
						}}
					>
						<div class="grid gap-2">
							<Label for="provider">Provider</Label>
							<select
								id="provider"
								name="provider"
								bind:value={provider}
								required
								disabled={isSubmitting}
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#each data.providers as p (p.id)}
									<option value={p.id}>{p.label}</option>
								{/each}
							</select>
						</div>

						<div class="grid gap-2">
							<Label for="name">Name</Label>
							<Input
								id="name"
								name="name"
								type="text"
								placeholder="My Forge API Key"
								bind:value={name}
								maxlength={100}
								required
								disabled={isSubmitting}
							/>
						</div>

						<div class="grid gap-2">
							<Label for="token">Bearer Token</Label>
							<Input
								id="token"
								name="token"
								type="password"
								placeholder="Paste your API token here"
								bind:value={token}
								maxlength={2000}
								required
								disabled={isSubmitting}
								aria-invalid={form?.errors?.token ? 'true' : undefined}
							/>
							{#if form?.errors?.token}
								<p class="text-sm text-destructive">{form.errors.token[0]}</p>
							{/if}
						</div>

						<div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onclick={closeForm}
								disabled={isSubmitting}
								class="sm:order-1"
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting} class="sm:order-2">
								{#if isSubmitting}
									<Loader2 class="mr-2 size-4 animate-spin" />
								{/if}
								Add key
							</Button>
						</div>
					</form>

					{#if !showAddForm}
						<Button variant="outline" class="gap-2" onclick={() => (showAddForm = true)}>
							<KeyRound class="size-4" />
							Add API key
						</Button>
					{/if}
				</CardContent>
			</Card>
		</div>
	</main>
</div>
