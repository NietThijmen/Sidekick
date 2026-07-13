import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';

if (!env.OPENROUTER_API_KEY) {
	throw new Error('OPENROUTER_API_KEY is not set');
}

export const openrouter = createOpenRouter({
	apiKey: env.OPENROUTER_API_KEY
});

export * from 'ai';
export * from './skills';
export { aiTools } from './tools';
