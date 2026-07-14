import { tool, generateImage, openrouter } from '$lib/server/ai';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = path.resolve('static/generated-images');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

type ImageModelId =
	| 'openai/gpt-image-1'
	| 'google/gemini-2.5-flash-image-preview'
	| 'black-forest-labs/flux-1.1-pro'
	| 'black-forest-labs/flux-dev'
	| 'black-forest-labs/flux-schnell'
	| 'google/imagen-4.0-generate-001'
	| (string & {});

const MODEL_OPTIONS: { value: ImageModelId; label: string }[] = [
	{ value: 'openai/gpt-image-1', label: 'GPT Image-1 (OpenAI) - Best overall quality' },
	{
		value: 'google/gemini-2.5-flash-image-preview',
		label: 'Gemini 2.5 Flash Image (Google) - Fast with text rendering'
	},
	{
		value: 'black-forest-labs/flux-1.1-pro',
		label: 'Flux 1.1 Pro (Black Forest Labs) - High fidelity'
	},
	{ value: 'black-forest-labs/flux-dev', label: 'Flux Dev - Experimental/unfiltered' },
	{ value: 'black-forest-labs/flux-schnell', label: 'Flux Schnell - Fastest generation' },
	{
		value: 'google/imagen-4.0-generate-001',
		label: 'Imagen 4.0 (Google) - High photorealism'
	},
	{
		value: 'bytedance-seed/seedream-4.5',
		label: 'Seedream 4.5 (ByteDance) - Balanced quality and speed (Minimal size: 3686400 pixels. For example, 1920x1920 or 2048x1800)'
	}
];

function generateFilename(): string {
	return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`;
}

export const imageGenerationTools = {
	generateImage: tool({
		description: `Generate an image from a text prompt using AI image models. Returns a URL to the generated image.
Available models:
${MODEL_OPTIONS.map((m) => `- ${m.value}: ${m.label}`).join('\n')}

Use this tool when the user asks to create, generate, draw, or imagine an image. Always provide a detailed, descriptive prompt for best results.`,
		inputSchema: z.object({
			prompt: z
				.string()
				.min(1)
				.max(4000)
				.describe(
					'A detailed description of the image to generate. Be specific about subject, style, colors, lighting, composition, and mood. Longer, more descriptive prompts produce better results.'
				),
			model: z
				.enum([
					'openai/gpt-image-1',
					'google/gemini-2.5-flash-image-preview',
					'black-forest-labs/flux-1.1-pro',
					'black-forest-labs/flux-dev',
					'black-forest-labs/flux-schnell',
					'google/imagen-4.0-generate-001'
				])
				.default('openai/gpt-image-1')
				.optional()
				.describe('The image model to use. Defaults to openai/gpt-image-1.'),
			size: z
				.string()
				.regex(/^\d+x\d+$/)
				.default('1024x1024')
				.optional()
				.describe(
					'Image size as WIDTHxHEIGHT in pixels. Common sizes: 1024x1024 (square), 1792x1024 (landscape), 1024x1792 (portrait). Not all sizes are supported by all models.'
				),
			n: z
				.number()
				.int()
				.min(1)
				.max(4)
				.default(1)
				.optional()
				.describe('Number of images to generate (1-4). Defaults to 1.')
		}),
		execute: async ({
			prompt,
			model: modelId,
			size,
			n
		}: {
			prompt: string;
			model?: ImageModelId;
			size?: string;
			n?: number;
		}) => {
			const selectedModel = modelId || 'openai/gpt-image-1';

			try {
				const imageModel = openrouter.imageModel(selectedModel);
				const result = await generateImage({
					model: imageModel,
					prompt,
					n: n ?? 1,
					...(size ? { size: size as `${number}x${number}` } : {})
				});

				const urls: string[] = [];

				for (const image of result.images) {
					const filename = generateFilename();
					const filePath = path.join(OUTPUT_DIR, filename);
					fs.writeFileSync(filePath, image.uint8Array);
					urls.push(`/generated-images/${filename}`);
				}

				return {
					model: selectedModel,
					prompt,
					images: urls.map((url) => ({
						url,
						markdown: `![Generated image](${url})`
					})),
					count: urls.length,
					warnings: result.warnings.map((w) => ({
						type: w.type,
						feature: 'feature' in w ? w.feature : undefined,
						details: 'details' in w ? w.details : undefined
					}))
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				return {
					error: `Image generation failed: ${message}`,
					model: selectedModel,
					prompt,
					suggestion:
						'Try a different model, simplify the prompt, or use a smaller size. Not all models support all size combinations.'
				};
			}
		}
	} as any),

	listImageModels: tool({
		description: 'List available AI image generation models with descriptions',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			return {
				models: MODEL_OPTIONS,
				default: 'openai/gpt-image-1',
				recommendations: {
					photorealism: 'google/imagen-4.0-generate-001',
					art: 'black-forest-labs/flux-1.1-pro',
					general: 'openai/gpt-image-1',
					text: 'google/gemini-2.5-flash-image-preview',
					fast: 'black-forest-labs/flux-schnell'
				}
			};
		}
	} as any)
};
