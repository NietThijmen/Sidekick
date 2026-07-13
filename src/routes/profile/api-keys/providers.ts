export const providers = [
	{ id: 'laravel-forge', label: 'Laravel Forge' }
] as const;

export type ProviderId = (typeof providers)[number]['id'];

export const providerLabels: Record<string, string> = {
	'laravel-forge': 'Laravel Forge'
};
