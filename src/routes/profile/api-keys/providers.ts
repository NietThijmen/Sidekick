export const providers = [
	{ id: 'laravel-forge', label: 'Laravel Forge' },
	{ id: 'context7', label: 'Context7 (Documentation Lookup)' },
	{ id: 'firecrawl', label: 'Firecrawl (Web Scraping & Search)' },
	{ id: 'sentry', label: 'Sentry (Error Tracking)' }
] as const;

export type ProviderId = (typeof providers)[number]['id'];

export const providerLabels: Record<string, string> = {
	'laravel-forge': 'Laravel Forge',
	context7: 'Context7',
	firecrawl: 'Firecrawl',
	sentry: 'Sentry'
};
