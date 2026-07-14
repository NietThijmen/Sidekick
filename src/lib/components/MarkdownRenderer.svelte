<script lang="ts">
	import { markdown, sanitizeHtml } from './markdown';

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();

	const rendered = $derived(sanitizeHtml(markdown.parse(content, { async: false }) as string));

	const copyIcon =
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
	const checkIcon =
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 15 2 2 4-4"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

	let container: HTMLDivElement;

	$effect(() => {
		rendered;
		if (!container) return;
		const buttons = container.querySelectorAll<HTMLButtonElement>('[data-copy-code]');
		buttons.forEach((btn) => {
			btn.innerHTML = copyIcon;
			btn.addEventListener('click', async () => {
				const code = decodeURIComponent(btn.getAttribute('data-copy-code') || '');
				try {
					await navigator.clipboard.writeText(code);
					btn.innerHTML = checkIcon;
					setTimeout(() => {
						btn.innerHTML = copyIcon;
					}, 2000);
				} catch {}
			});
		});
	});
</script>

<div
	bind:this={container}
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

	:global(.code-block-wrapper) {
		position: relative;
	}

	:global(.copy-button) {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		padding: 0.3rem;
		color: #9ca3af;
		background-color: rgba(55, 65, 81, 0.8);
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.code-block-wrapper:hover .copy-button) {
		opacity: 1;
	}

	:global(.copy-button:hover) {
		background-color: rgba(75, 85, 99, 0.8);
		color: #e5e7eb;
	}
</style>
