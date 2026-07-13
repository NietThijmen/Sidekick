<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
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
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import {
		ArrowLeft,
		Bot,
		Loader2,
		Plus,
		Pencil,
		Trash2,
		X,
		Save,
		Rocket
	} from '@lucide/svelte';

	interface Agent {
		id: string;
		name: string;
		description: string | null;
		systemPrompt: string;
		model: string;
	}

	interface AgentFormData {
		error?: string;
		errors?: Record<string, string[]>;
		success?: boolean;
	}

	let {
		data,
		form
	}: {
		data: { agents: Agent[] };
		form: AgentFormData;
	} = $props();

	let isCreating = $state(false);
	let isSaving = $state(false);
	let editingId = $state<string | null>(null);
	let editingModel = $state('');
	let deletingId = $state<string | null>(null);
	let showSuccess = $state(false);

	let newForm = $state({ name: '', description: '', systemPrompt: '', model: 'openai/gpt-5.6-luna' });

	let models = $state<Array<{ id: string; name: string; lab: string; tier: number }>>([]);

	async function loadModels() {
		const res = await fetch('/api/models');
		if (res.ok) {
			models = await res.json();
		}
	}

	function resetCreate() {
		newForm = { name: '', description: '', systemPrompt: '', model: 'openai/gpt-5.6-luna' };
		isCreating = false;
	}

	function startEdit(agent: Agent) {
		editingId = agent.id;
		editingModel = agent.model;
	}

	function cancelEdit() {
		editingId = null;
	}

	function modelName(modelId: string): string {
		return models.find((m) => m.id === modelId)?.name ?? modelId;
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

	$effect(() => {
		loadModels();
	});
</script>

<svelte:head>
	<title>Custom Agents</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<header class="border-b">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon-sm" href={resolve('/profile')} aria-label="Back to profile">
					<ArrowLeft class="size-4" />
				</Button>
				<h1 class="text-lg font-semibold">Custom Agents</h1>
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
				New agent
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
					<CardTitle class="text-base">Create Agent</CardTitle>
					<CardDescription>Configure a custom agent with its own system prompt and default model.</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						method="post"
						action="?/createAgent"
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
								placeholder="e.g., Code Reviewer"
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
								placeholder="What this agent does"
								bind:value={newForm.description}
								maxlength={500}
								disabled={isSaving}
							/>
						</div>

						<div class="grid gap-2">
							<Label for="systemPrompt">System Prompt</Label>
							<textarea
								id="systemPrompt"
								name="systemPrompt"
								placeholder="Instructions for the agent..."
								bind:value={newForm.systemPrompt}
								maxlength={10000}
								disabled={isSaving}
								class="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							></textarea>
							<p class="text-xs text-muted-foreground">
								This will be appended to the base system prompt as an "Agent Instructions" section.
							</p>
						</div>

						<div class="grid gap-2">
							<Label for="model">Default Model</Label>
			<ModelSelector
				models={models}
				value={newForm.model}
				onSelect={(id) => newForm.model = id}
				name="model"
				disabled={isSaving}
				fullWidth
			/>
						</div>

						{#if form?.error && !isSaving}
							<div class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
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
								Create Agent
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		{/if}

		<div class="space-y-3">
			{#if data.agents.length === 0 && !isCreating}
				<Card>
					<CardContent class="flex flex-col items-center gap-3 py-12 text-center">
						<Bot class="size-12 text-muted-foreground" />
						<h2 class="text-lg font-semibold">No custom agents yet</h2>
						<p class="max-w-sm text-sm text-muted-foreground">
							Create custom agents with their own system prompts and default models.
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
							Create your first agent
						</Button>
					</CardContent>
				</Card>
			{/if}

			{#each data.agents as agentItem (agentItem.id)}
				<Card class="overflow-visible">
					<CardHeader class="pb-3">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-2">
								<Bot class="size-5 text-muted-foreground" />
								<div>
									<CardTitle class="text-base">{agentItem.name}</CardTitle>
									{#if agentItem.description}
										<CardDescription class="text-sm">{agentItem.description}</CardDescription>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-1">
								{#if deletingId === agentItem.id}
									<form method="post" action="?/deleteAgent" class="flex items-center gap-1">
										<input type="hidden" name="id" value={agentItem.id} />
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
										onclick={() => startEdit(agentItem)}
										aria-label="Edit agent"
									>
										<Pencil class="size-3.5" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										class="size-7 text-destructive hover:text-destructive"
										onclick={() => (deletingId = agentItem.id)}
										aria-label="Delete agent"
									>
										<Trash2 class="size-3.5" />
									</Button>
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{#if editingId === agentItem.id}
							<form
								method="post"
								action="?/updateAgent"
								use:enhance={() => {
									isSaving = true;
									return async ({ update }) => {
										await update();
										isSaving = false;
									};
								}}
								class="grid gap-4"
							>
								<input type="hidden" name="id" value={agentItem.id} />

								<div class="grid gap-2">
									<Label for="name-{agentItem.id}">Name</Label>
									<Input
										id="name-{agentItem.id}"
										name="name"
										type="text"
										value={agentItem.name}
										maxlength={100}
										required
										disabled={isSaving}
									/>
								</div>

								<div class="grid gap-2">
									<Label for="description-{agentItem.id}">Description</Label>
									<Input
										id="description-{agentItem.id}"
										name="description"
										type="text"
										value={agentItem.description ?? ''}
										maxlength={500}
										disabled={isSaving}
									/>
								</div>

								<div class="grid gap-2">
									<Label for="systemPrompt-{agentItem.id}">System Prompt</Label>
									<textarea
										id="systemPrompt-{agentItem.id}"
										name="systemPrompt"
										maxlength={10000}
										disabled={isSaving}
										class="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									>{agentItem.systemPrompt}</textarea>
								</div>

								<div class="grid gap-2">
									<Label for="model-{agentItem.id}">Default Model</Label>
									<ModelSelector
										models={models}
										value={editingModel}
										onSelect={(id) => editingModel = id}
										name="model"
										disabled={isSaving}
										fullWidth
									/>
								</div>

								{#if form?.error && !isSaving}
									<div class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
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
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Rocket class="size-4" />
									<span>Model: <span class="font-medium text-foreground">{modelName(agentItem.model)}</span></span>
								</div>
								{#if agentItem.systemPrompt}
									<div>
										<h3 class="mb-1 text-xs font-medium text-muted-foreground">System Prompt</h3>
										<p class="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{agentItem.systemPrompt}</p>
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
