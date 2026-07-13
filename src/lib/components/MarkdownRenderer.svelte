<script lang="ts">
	import { marked } from 'marked';
	import hljs from 'highlight.js';
	import 'highlight.js/styles/github-dark.css';

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();

	marked.use({
		renderer: {
			code({ text, lang }: { text: string; lang?: string }) {
				const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
				const highlighted = hljs.highlight(text, { language }).value;
				return `<div class="hljs overflow-x-auto rounded-lg"><pre class="m-0 p-4"><code class="language-${language}">${highlighted}</code></pre></div>`;
			}
		},
		gfm: true,
		breaks: false,
		headerIds: false,
		mangle: false
	});

	const rendered = $derived(marked.parse(content, { async: false }) as string);
</script>

<div
	class="prose prose-sm max-w-none dark:prose-invert {className}"
	class:prose-invert={className.includes('text-primary-foreground')}
>
	{@html rendered}
</div>

<style>
	:global(.prose pre) {
		margin: 0;
	}

	:global(.prose code) {
		@apply rounded px-1 py-0.5 text-xs;
	}

	:global(.prose code:not(pre code)) {
		@apply bg-muted text-foreground;
	}

	:global(.prose pre code) {
		@apply bg-transparent p-0 text-inherit;
	}

	:global(.prose table) {
		@apply w-full text-sm;
	}

	:global(.prose th, .prose td) {
		@apply border px-3 py-2;
	}

	:global(.prose th) {
		@apply bg-muted font-semibold;
	}

	:global(.prose blockquote) {
		@apply border-l-4 border-muted-foreground/30 pl-4 italic;
	}

	:global(.prose ul.contains-task-list) {
		@apply list-none pl-0;
	}

	:global(.prose li.task-list-item) {
		@apply flex items-center gap-2;
	}

	:global(.prose input[type='checkbox']) {
		@apply pointer-events-none;
	}
</style>
