import { Marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'isomorphic-dompurify';
import 'highlight.js/styles/github-dark.css';

export const markdown = new Marked({
	gfm: true,
	breaks: false
});

markdown.use({
	renderer: {
		code({ text, lang }: { text: string; lang?: string }) {
			const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
			const highlighted = hljs.highlight(text, { language }).value;
			return `<div class="hljs overflow-x-auto rounded-lg"><pre class="m-0 p-4"><code class="language-${language}">${highlighted}</code></pre></div>`;
		}
	}
});

export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true }
	});
}
