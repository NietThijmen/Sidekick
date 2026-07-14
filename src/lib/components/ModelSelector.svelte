<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Model {
		id: string;
		name: string;
		lab: string;
		tier: number;
	}

	interface Agent {
		id: string;
		name: string;
	}

	let {
		models = [],
		value = '',
		onSelect,
		name,
		inheritFromAgent,
		disabled = false,
		fullWidth = false,
		class: className = ''
	}: {
		models: Model[];
		value: string;
		onSelect?: (modelId: string) => void;
		name?: string;
		inheritFromAgent?: Agent | null;
		disabled?: boolean;
		fullWidth?: boolean;
		class?: string;
	} = $props();

	let show = $state(false);
	let search = $state('');

	function focusSearch(node: HTMLInputElement) {
		$effect(() => {
			if (show) {
				search = '';
				tick().then(() => node.focus());
			}
		});
	}

	let selected = $derived(models.find((m) => m.id === value));

	let filtered = $derived(
		search ? models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) : models
	);

	let byLab = $derived(
		filtered.reduce(
			(groups, m) => {
				(groups[m.lab] ??= []).push(m);
				return groups;
			},
			{} as Record<string, Model[]>
		)
	);

	function tierLabel(tier: number): string {
		return '$'.repeat(tier);
	}

	function selectModel(id: string) {
		show = false;
		search = '';
		onSelect?.(id);
	}
</script>

<div class={cn('relative', fullWidth && 'w-full', className)}>
	{#if name}
		<input type="hidden" {name} value={selected?.id ?? value} />
	{/if}

	<button
		type="button"
		onclick={() => (show = !show)}
		{disabled}
		class={cn(
			'flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50',
			fullWidth && 'w-full'
		)}
	>
		<span>{selected?.name ?? 'Select a model'}</span>
		{#if selected}
			<span class="tabular-nums">{tierLabel(selected.tier)}</span>
		{/if}
		<ChevronDown class="size-3 shrink-0" />
	</button>

	{#if show}
		<div class="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border bg-popover shadow-lg">
			<div class="border-b p-2">
				<input
					use:focusSearch
					type="text"
					placeholder="Search models..."
					bind:value={search}
					class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					onclick={(e) => e.stopPropagation()}
				/>
			</div>
			<div class="max-h-72 overflow-y-auto p-1">
				{#each Object.entries(byLab) as [lab, labModels] (lab)}
					<div
						class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
					>
						{lab}
					</div>
					{#each labModels as model (model.id)}
						<button
							type="button"
							onclick={() => selectModel(model.id)}
							class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted {model.id ===
							value
								? 'bg-muted font-medium'
								: ''}"
						>
							<span class="truncate">{model.name}</span>
							<span class="shrink-0 tabular-nums text-muted-foreground"
								>{tierLabel(model.tier)}</span
							>
						</button>
					{/each}
				{/each}
				{#if Object.keys(byLab).length === 0}
					<p class="px-3 py-4 text-center text-xs text-muted-foreground">
						No models match your search.
					</p>
				{/if}
			</div>
			{#if inheritFromAgent}
				<div class="border-t px-3 py-2 text-[10px] text-muted-foreground">
					Model inherited from agent "<span class="font-medium">{inheritFromAgent.name}</span>"
				</div>
			{/if}
		</div>

		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			onclick={() => (show = false)}
			aria-label="Close model selector"
		></button>
	{/if}
</div>
