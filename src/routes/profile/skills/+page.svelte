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
	import {
		ArrowLeft,
		Loader2,
		Plus,
		Pencil,
		Trash2,
		X,
		Save,
		Zap,
		ToggleLeft,
		ToggleRight
	} from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	interface Skill {
		id: string;
		name: string;
		description: string | null;
		triggers: string[];
		content: string;
		enabled: boolean;
	}

	interface SkillFormData {
		error?: string;
		success?: boolean;
	}

	let {
		data,
		form
	}: {
		data: { skills: Skill[] };
		form: SkillFormData;
	} = $props();

	let isCreating = $state(false);
	let isSaving = $state(false);
	let editingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let showSuccess = $state(false);
	let editingTriggers = $state('');

	let newForm = $state({
		name: '',
		description: '',
		triggers: '',
		content: ''
	});

	function resetCreate() {
		newForm = { name: '', description: '', triggers: '', content: '' };
		isCreating = false;
	}

	function startEdit(skill: Skill) {
		editingId = skill.id;
		editingTriggers = skill.triggers.join(', ');
	}

	function cancelEdit() {
		editingId = null;
	}

	async function handleToggle(skillId: string, currentlyEnabled: boolean) {
		const formData = new SvelteURLSearchParams({
			id: skillId,
			enabled: String(!currentlyEnabled)
		});
		await fetch('?/toggleSkill', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formData
		});
		await invalidateAll();
	}

	$effect(() => {
		if (form?.success) {
			showSuccess = true;
			isCreating = false;
			editingId = null;
			const timer = setTimeout(() => {
				showSuccess = false;
			}, 3000);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:head>
	<title>Custom Skills</title>
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
				<h1 class="text-lg font-semibold">Custom Skills</h1>
			</div>
			<Button
				variant="outline"
				size="sm"
				class="gap-2"
				onclick={() => {
					resetCreate();
					isCreating = true;
				}}
			>
				<Plus class="size-4" />
				New skill
			</Button>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-8">
		{#if showSuccess}
			<div
				class="mb-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
				role="status"
			>
				Changes saved successfully.
			</div>
		{/if}

		{#if isCreating}
			<Card class="mb-6 overflow-visible border-primary/30">
				<CardHeader>
					<CardTitle class="text-base">Create Skill</CardTitle>
					<CardDescription>Define a new skill with trigger words and instructions.</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						method="post"
						action="?/createSkill"
						use:enhance={() => {
							isSaving = true;
							return async ({ update }) => {
								await update();
								isSaving = false;
							};
						}}
						class="grid gap-4"
					>
						<div class="grid gap-2">
							<Label for="name">Name</Label>
							<Input
								id="name"
								name="name"
								type="text"
								placeholder="e.g., my-skill"
								bind:value={newForm.name}
								maxlength={100}
								required
								disabled={isSaving}
							/>
						</div>

						<div class="grid gap-2">
							<Label for="description">Description</Label>
							<Input
								id="description"
								name="description"
								type="text"
								placeholder="What this skill does"
								bind:value={newForm.description}
								maxlength={500}
								disabled={isSaving}
							/>
						</div>

						<div class="grid gap-2">
							<Label for="triggers">
								Triggers
								<span class="text-xs text-muted-foreground"> (comma-separated)</span>
							</Label>
							<Input
								id="triggers"
								name="triggers"
								type="text"
								placeholder="e.g., my tool, deploy, analyze"
								bind:value={newForm.triggers}
								required
								disabled={isSaving}
							/>
						</div>

						<div class="grid gap-2">
							<Label for="content">Instructions</Label>
							<textarea
								id="content"
								name="content"
								placeholder="Instructions injected into the system prompt when this skill is triggered..."
								bind:value={newForm.content}
								required
								disabled={isSaving}
								class="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							></textarea>
						</div>

						{#if form?.error && !isSaving}
							<div
								class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
								role="alert"
							>
								{form.error}
							</div>
						{/if}

						<div class="flex justify-end gap-2">
							<Button type="button" variant="outline" onclick={resetCreate} disabled={isSaving}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSaving}>
								{#if isSaving}
									<Loader2 class="mr-2 size-4 animate-spin" />
								{/if}
								<Save class="mr-2 size-4" />
								Create Skill
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		{/if}

		<div class="space-y-3">
			{#if data.skills.length === 0 && !isCreating}
				<Card>
					<CardContent class="flex flex-col items-center gap-3 py-12 text-center">
						<Zap class="size-12 text-muted-foreground" />
						<h2 class="text-lg font-semibold">No custom skills yet</h2>
						<p class="max-w-sm text-sm text-muted-foreground">
							Create custom skills that activate on trigger words. Agents can also create and modify
							skills during conversations.
						</p>
						<Button
							variant="default"
							size="sm"
							class="mt-2 gap-2"
							onclick={() => {
								resetCreate();
								isCreating = true;
							}}
						>
							<Plus class="size-4" />
							Create your first skill
						</Button>
					</CardContent>
				</Card>
			{/if}

			{#each data.skills as skillItem (skillItem.id)}
				<Card class="overflow-visible {skillItem.enabled ? '' : 'opacity-60'}">
					<CardHeader class="pb-3">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-2">
								<Zap class="size-5 text-muted-foreground" />
								<div>
									<CardTitle class="text-base">{skillItem.name}</CardTitle>
									{#if skillItem.description}
										<CardDescription class="text-sm">{skillItem.description}</CardDescription>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									class="size-7"
									onclick={() => handleToggle(skillItem.id, skillItem.enabled)}
									title={skillItem.enabled ? 'Disable' : 'Enable'}
								>
									{#if skillItem.enabled}
										<ToggleRight class="size-4 text-primary" />
									{:else}
										<ToggleLeft class="size-4 text-muted-foreground" />
									{/if}
								</Button>
								{#if deletingId === skillItem.id}
									<form method="post" action="?/deleteSkill" class="flex items-center gap-1">
										<input type="hidden" name="id" value={skillItem.id} />
										<Button
											type="submit"
											variant="ghost"
											size="icon-xs"
											class="size-7 text-destructive hover:text-destructive"
											aria-label="Confirm delete"
										>
											<Trash2 class="size-3.5" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											class="size-7"
											onclick={() => (deletingId = null)}
											aria-label="Cancel delete"
										>
											<X class="size-3.5" />
										</Button>
									</form>
								{:else}
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										class="size-7"
										onclick={() => startEdit(skillItem)}
										aria-label="Edit skill"
									>
										<Pencil class="size-3.5" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										class="size-7 text-destructive hover:text-destructive"
										onclick={() => (deletingId = skillItem.id)}
										aria-label="Delete skill"
									>
										<Trash2 class="size-3.5" />
									</Button>
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{#if editingId === skillItem.id}
							<form
								method="post"
								action="?/updateSkill"
								use:enhance={() => {
									isSaving = true;
									return async ({ update }) => {
										await update();
										isSaving = false;
									};
								}}
								class="grid gap-4"
							>
								<input type="hidden" name="id" value={skillItem.id} />

								<div class="grid gap-2">
									<Label for="name-{skillItem.id}">Name</Label>
									<Input
										id="name-{skillItem.id}"
										name="name"
										type="text"
										value={skillItem.name}
										maxlength={100}
										required
										disabled={isSaving}
									/>
								</div>

								<div class="grid gap-2">
									<Label for="description-{skillItem.id}">Description</Label>
									<Input
										id="description-{skillItem.id}"
										name="description"
										type="text"
										value={skillItem.description ?? ''}
										maxlength={500}
										disabled={isSaving}
									/>
								</div>

								<div class="grid gap-2">
									<Label for="triggers-{skillItem.id}">
										Triggers
										<span class="text-xs text-muted-foreground"> (comma-separated)</span>
									</Label>
									<Input
										id="triggers-{skillItem.id}"
										name="triggers"
										type="text"
										bind:value={editingTriggers}
										required
										disabled={isSaving}
									/>
								</div>

								<div class="grid gap-2">
									<Label for="content-{skillItem.id}">Instructions</Label>
									<textarea
										id="content-{skillItem.id}"
										name="content"
										required
										disabled={isSaving}
										class="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
										>{skillItem.content}</textarea
									>
								</div>

								{#if form?.error && !isSaving}
									<div
										class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
										role="alert"
									>
										{form.error}
									</div>
								{/if}

								<div class="flex justify-end gap-2">
									<Button type="button" variant="outline" onclick={cancelEdit} disabled={isSaving}>
										Cancel
									</Button>
									<Button type="submit" disabled={isSaving}>
										{#if isSaving}
											<Loader2 class="mr-2 size-4 animate-spin" />
										{/if}
										Save
									</Button>
								</div>
							</form>
						{:else}
							<div class="grid gap-3">
								<div class="flex flex-wrap gap-1">
									{#each skillItem.triggers as trigger (trigger)}
										<span
											class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
										>
											{trigger}
										</span>
									{/each}
								</div>
								{#if skillItem.content}
									<div>
										<h3 class="mb-1 text-xs font-medium text-muted-foreground">Instructions</h3>
										<p class="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
											{skillItem.content}
										</p>
									</div>
								{/if}
							</div>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	</main>
</div>
