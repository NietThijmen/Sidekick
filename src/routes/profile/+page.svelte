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
	import {
		ArrowLeft,
		Bot,
		Calendar,
		KeyRound,
		Loader2,
		LogOut,
		Pencil,
		Shield
	} from '@lucide/svelte';

	interface ProfileFormData {
		error?: string;
		errors?: Record<string, string[]>;
		success?: boolean;
	}

	let {
		data,
		form
	}: {
		data: {
			profile: {
				name: string;
				email: string;
				image: string | null;
				username: string | null;
				bio: string | null;
				createdAt: Date | number;
			};
		};
		form: ProfileFormData;
	} = $props();

	let isEditing = $state(false);
	let isSaving = $state(false);
	let showSuccess = $state(false);

	let editValues = $state({
		name: data.profile.name,
		username: data.profile.username ?? '',
		bio: data.profile.bio ?? '',
		image: data.profile.image ?? ''
	});

	function getInitials(name: string) {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function formatJoinDate(date: Date | number) {
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function resetEditValues() {
		editValues = {
			name: data.profile.name,
			username: data.profile.username ?? '',
			bio: data.profile.bio ?? '',
			image: data.profile.image ?? ''
		};
		isEditing = false;
		showSuccess = false;
	}

	async function handleLogout() {
		await fetch('/api/auth/sign-out', { method: 'POST' });
		window.location.href = '/login';
	}

	$effect(() => {
		if (form?.success) {
			showSuccess = true;
			isEditing = false;
			const timer = setTimeout(() => {
				showSuccess = false;
			}, 3000);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:head>
	<title>Profile</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<header class="border-b">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon-sm" href={resolve('/chat')} aria-label="Back to home">
					<ArrowLeft class="size-4" />
				</Button>
				<h1 class="text-lg font-semibold">Profile</h1>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="sm" href={resolve('/profile/agents')} class="gap-2">
					<Bot class="size-4" />
					<span class="hidden sm:inline">Agents</span>
				</Button>
				<Button variant="ghost" size="sm" href={resolve('/profile/api-keys')} class="gap-2">
					<KeyRound class="size-4" />
					<span class="hidden sm:inline">API Keys</span>
				</Button>
				<Button variant="ghost" size="sm" href={resolve('/profile/auth')} class="gap-2">
					<Shield class="size-4" />
					<span class="hidden sm:inline">Security</span>
				</Button>
				<Button variant="ghost" size="sm" onclick={handleLogout} class="gap-2">
					<LogOut class="size-4" />
					<span class="hidden sm:inline">Sign out</span>
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-8">
		<Card>
			<CardHeader class="pb-4">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="flex items-center gap-4">
						<div
							class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-semibold text-primary-foreground"
							aria-hidden="true"
						>
							{#if data.profile.image}
								<img src={data.profile.image} alt="" class="size-full object-cover" />
							{:else}
								{getInitials(data.profile.name)}
							{/if}
						</div>
						<div>
							<CardTitle class="text-xl">{data.profile.name}</CardTitle>
							{#if data.profile.username}
								<CardDescription class="text-base">@{data.profile.username}</CardDescription>
							{/if}
							<p class="mt-1 text-sm text-muted-foreground">{data.profile.email}</p>
						</div>
					</div>
					{#if !isEditing}
						<Button
							variant="outline"
							size="sm"
							class="gap-2"
							onclick={() => {
								resetEditValues();
								isEditing = true;
							}}
						>
							<Pencil class="size-4" />
							Edit profile
						</Button>
					{/if}
				</div>
			</CardHeader>

			<CardContent class="grid gap-6">
				{#if form?.error && !isSaving}
					<div class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
						{form.error}
					</div>
				{/if}

				{#if showSuccess}
					<div
						class="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
						role="status"
					>
						Your profile has been updated successfully.
					</div>
				{/if}

				{#if isEditing}
					<form
						method="post"
						action="?/updateProfile"
						use:enhance={() => {
							isSaving = true;
							showSuccess = false;
							return async ({ update }) => {
								await update();
								isSaving = false;
							};
						}}
						class="grid gap-4"
					>
						<div class="grid gap-2">
							<Label for="name">Display name</Label>
							<Input
								id="name"
								name="name"
								type="text"
								placeholder="Your display name"
								bind:value={editValues.name}
								maxlength={100}
								required
								aria-invalid={form?.errors?.name ? 'true' : undefined}
								disabled={isSaving}
							/>
							{#if form?.errors?.name}
								<p class="text-sm text-destructive">{form.errors.name[0]}</p>
							{/if}
						</div>

						<div class="grid gap-2">
							<Label for="username">Username</Label>
							<Input
								id="username"
								name="username"
								type="text"
								placeholder="your_username"
								bind:value={editValues.username}
								maxlength={50}
								aria-invalid={form?.errors?.username ? 'true' : undefined}
								disabled={isSaving}
							/>
							{#if form?.errors?.username}
								<p class="text-sm text-destructive">{form.errors.username[0]}</p>
							{/if}
						</div>

						<div class="grid gap-2">
							<Label for="image">Avatar URL</Label>
							<Input
								id="image"
								name="image"
								type="url"
								placeholder="https://example.com/avatar.png"
								bind:value={editValues.image}
								maxlength={500}
								aria-invalid={form?.errors?.image ? 'true' : undefined}
								disabled={isSaving}
							/>
							{#if form?.errors?.image}
								<p class="text-sm text-destructive">{form.errors.image[0]}</p>
							{/if}
						</div>

						<div class="grid gap-2">
							<Label for="bio">Bio</Label>
							<Input
								id="bio"
								name="bio"
								type="text"
								placeholder="Tell us a little about yourself..."
								bind:value={editValues.bio}
								maxlength={500}
								aria-invalid={form?.errors?.bio ? 'true' : undefined}
								disabled={isSaving}
							/>
							{#if form?.errors?.bio}
								<p class="text-sm text-destructive">{form.errors.bio[0]}</p>
							{/if}
						</div>

						<div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onclick={resetEditValues}
								disabled={isSaving}
								class="sm:order-1"
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSaving} class="sm:order-2">
								{#if isSaving}
									<Loader2 class="mr-2 size-4 animate-spin" />
								{/if}
								Save changes
							</Button>
						</div>
					</form>
				{:else}
					<div class="grid gap-4">
						{#if data.profile.bio}
							<div>
								<h2 class="text-sm font-medium text-muted-foreground">About</h2>
								<p class="mt-1 whitespace-pre-wrap text-sm">{data.profile.bio}</p>
							</div>
						{:else}
							<div>
								<h2 class="text-sm font-medium text-muted-foreground">About</h2>
								<p class="mt-1 text-sm text-muted-foreground italic">No bio provided.</p>
							</div>
						{/if}

						<Separator />

						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Calendar class="size-4" aria-hidden="true" />
							<span>Joined {formatJoinDate(data.profile.createdAt)}</span>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	</main>
</div>
