<script lang="ts">
	import { Bot } from '@lucide/svelte';

	let { lab = '', class: className = '' }: { lab?: string; class?: string } = $props();
</script>

{#if lab === 'OpenAI'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z" />
	</svg>
{:else if lab === 'Anthropic'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M4 20 L10 4 L14 4 L20 20 L16 20 L14.5 16 L9.5 16 L8 20 Z" />
		<path d="M10.5 12.5 L13.5 12.5" />
	</svg>
{:else if lab === 'Google'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="12" cy="12" r="9" />
		<path d="M15 9 C16 10.5 16 13.5 15 15 C14 16.5 12 17 10 16 C8 15 7 13 7 12 C7 11 8 9 10 8 C12 7 14 7.5 15 9" />
		<line x1="7" y1="12" x2="17" y2="12" />
	</svg>
{:else if lab === 'DeepSeek'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M3 18 Q6 6 12 6 Q18 6 21 18" />
		<path d="M6 15 Q9 9 12 9 Q15 9 18 15" />
		<circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none" />
	</svg>
{:else if lab === 'Meta'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M12 4 C8 4 4 7 4 12 C4 17 8 20 12 20 C16 20 20 17 20 12 C20 7 16 4 12 4" />
		<path d="M8 12 Q10 8 12 12 Q14 16 16 12" />
	</svg>
{:else if lab === 'Mistral'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M4 6 L8 6 L8 18 L4 18 Z" />
		<path d="M9 6 L13 6 L13 18 L9 18 Z" />
		<path d="M14 6 L18 6 L18 18 L14 18 Z" />
		<path d="M19 6 L21 6 L21 18 L19 18 Z" />
	</svg>
{:else if lab === 'xAI'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<line x1="4" y1="4" x2="20" y2="20" />
		<line x1="20" y1="4" x2="4" y2="20" />
		<circle cx="12" cy="12" r="9" />
	</svg>
{:else if lab === 'Perplexity'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="12" cy="12" r="9" />
		<path d="M12 3 L12 21" />
		<path d="M3 12 L21 12" />
		<circle cx="12" cy="12" r="3" />
	</svg>
{:else if lab === 'Cohere'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M12 2 C8 2 5 6 5 10 C5 14 8 18 12 18 C16 18 19 14 19 10" />
		<circle cx="12" cy="18" r="4" />
	</svg>
{:else}
	<Bot class={className} />
{/if}
