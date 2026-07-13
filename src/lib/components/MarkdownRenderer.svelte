<script lang="ts">
	import { markdown, sanitizeHtml } from './markdown';

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();

	const rendered = $derived(sanitizeHtml(markdown.parse(content, { async: false }) as string));
</script>

<div
	class="prose prose-sm max-w-none dark:prose-invert {className}"
	class:prose-invert={className.includes('text-primary-foreground')}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html rendered}
</div>

<style>
	:global(.prose pre) {
		margin: 0;
	}

	:global(.prose code) {
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		font-size: 0.75rem;
		line-height: 1rem;
	}

	:global(.prose code:not(pre code)) {
		background-color: var(--muted);
		color: var(--foreground);
	}

	:global(.prose pre code) {
		background-color: transparent;
		padding: 0;
		color: inherit;
	}

	:global(.prose table) {
		width: 100%;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	:global(.prose th, .prose td) {
		border-width: 1px;
		padding: 0.5rem 0.75rem;
	}

	:global(.prose th) {
		background-color: var(--muted);
		font-weight: 600;
	}

	:global(.prose blockquote) {
		border-left-width: 4px;
		border-color: color-mix(in oklch, var(--muted-foreground) 30%, transparent);
		padding-left: 1rem;
		font-style: italic;
	}

	:global(.prose ul.contains-task-list) {
		list-style-type: none;
		padding-left: 0;
	}

	:global(.prose li.task-list-item) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	:global(.prose input[type='checkbox']) {
		pointer-events: none;
	}
</style>
