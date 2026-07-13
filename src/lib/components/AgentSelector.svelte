<script lang="ts">
	import { Sparkles, X, ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import { resolve } from '$app/paths';

	interface Agent {
		id: string;
		name: string;
		description: string | null;
	}

	let {
		agents = [],
		value = '',
		onSelect,
		onRemove,
		name
	}: {
		agents: Agent[];
		value: string;
		onSelect?: (agentId: string) => void;
		onRemove?: () => void;
		name?: string;
	} = $props();

	let show = $state(false);

	let selected = $derived(agents.find((a) => a.id === value));

	function selectAgent(id: string) {
		show = false;
		onSelect?.(id);
	}
</script>

<div class="relative">
	{#if name}
		<input type="hidden" {name} value={selected?.id ?? value} />
	{/if}

	<button
		type="button"
		onclick={() => (show = !show)}
		class="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
	>
		<Sparkles class="size-3" />
		<span>{selected?.name ?? 'Agent'}</span>
		<ChevronDown class="size-3 shrink-0" />
	</button>

	{#if show}
		<div class="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover shadow-lg">
			<div class="max-h-64 overflow-y-auto p-1">
				{#if selected}
					<button
						type="button"
						onclick={() => { show = false; onRemove?.(); }}
						class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
					>
						<X class="size-3" />
						Remove agent
					</button>
					<div class="border-t my-1"></div>
				{/if}
				{#each agents as a (a.id)}
					<button
						type="button"
						onclick={() => selectAgent(a.id)}
						class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted {a.id ===
						value
							? 'bg-emerald-500/10 font-medium'
							: ''}"
					>
						<div class="flex flex-col">
							<span>{a.name}</span>
							{#if a.description}
								<span class="text-[10px] text-muted-foreground">{a.description}</span>
							{/if}
						</div>
					</button>
				{/each}
				{#if agents.length === 0}
					<p class="px-3 py-4 text-center text-xs text-muted-foreground">
						No agents created yet.
						<a href={resolve('/profile/agents')} class="underline">Create one</a>.
					</p>
				{/if}
			</div>
		</div>

		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			onclick={() => (show = false)}
			aria-label="Close agent selector"
		></button>
	{/if}
</div>
