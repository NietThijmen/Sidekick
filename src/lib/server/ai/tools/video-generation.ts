import { tool, experimental_generateVideo } from 'ai';
import { openrouter } from '$lib/server/ai';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = path.resolve('static/generated-videos');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

type VideoModelId =
	| 'openai/sora-2-pro'
	| 'google/veo-3.1'
	| 'google/veo-3.1-fast'
	| 'google/veo-3.1-lite'
	| 'kwaivgi/kling-v3.0-pro'
	| 'kwaivgi/kling-v3.0-std'
	| 'kwaivgi/kling-video-o1'
	| 'minimax/hailuo-2.3'
	| 'alibaba/wan-2.7'
	| 'alibaba/wan-2.6'
	| 'bytedance/seedance-2.0'
	| 'bytedance/seedance-2.0-fast'
	| 'bytedance/seedance-1-5-pro'
	| 'alibaba/happyhorse-1.1'
	| 'x-ai/grok-imagine-video'
	| (string & {});

const MODEL_OPTIONS: { value: VideoModelId; label: string }[] = [
	{ value: 'openai/sora-2-pro', label: 'Sora 2 Pro (OpenAI) - Production-quality with audio' },
	{ value: 'google/veo-3.1', label: 'Veo 3.1 (Google) - Maximum visual fidelity, 1080p' },
	{ value: 'google/veo-3.1-fast', label: 'Veo 3.1 Fast (Google) - Balanced speed and quality' },
	{ value: 'google/veo-3.1-lite', label: 'Veo 3.1 Lite (Google) - Fastest, cost-efficient' },
	{
		value: 'kwaivgi/kling-v3.0-pro',
		label: 'Kling v3.0 Pro (Kuaishou) - Premium quality'
	},
	{ value: 'kwaivgi/kling-v3.0-std', label: 'Kling v3.0 Standard (Kuaishou) - Good quality' },
	{
		value: 'kwaivgi/kling-video-o1',
		label: 'Kling Video O1 (Kuaishou) - Optimized for speed'
	},
	{
		value: 'minimax/hailuo-2.3',
		label: 'Hailuo 2.3 (MiniMax) - Text and image to video'
	},
	{ value: 'alibaba/wan-2.7', label: 'Wan 2.7 (Alibaba) - Latest version, best quality' },
	{
		value: 'alibaba/wan-2.6',
		label: 'Wan 2.6 (Alibaba) - Text/image/reference to video'
	},
	{
		value: 'bytedance/seedance-2.0',
		label: 'Seedance 2.0 (ByteDance) - Latest generation'
	},
	{
		value: 'bytedance/seedance-2.0-fast',
		label: 'Seedance 2.0 Fast (ByteDance) - Faster generation'
	},
	{
		value: 'bytedance/seedance-1-5-pro',
		label: 'Seedance 1.5 Pro (ByteDance) - Proven quality'
	},
	{
		value: 'alibaba/happyhorse-1.1',
		label: 'HappyHorse 1.1 (Alibaba) - Fast text/image to video'
	},
	{
		value: 'x-ai/grok-imagine-video',
		label: 'Grok Imagine Video (xAI) - Text/image to video'
	}
];

function generateFilename(): string {
	return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp4`;
}

export const videoGenerationTools = {
	generateVideo: tool({
		description: `Generate a video from a text prompt or reference image using AI video models. Returns a URL to the generated video.
Available models:
${MODEL_OPTIONS.map((m) => `- ${m.value}: ${m.label}`).join('\n')}

Use this tool when the user asks to create, generate, animate, or produce a video. Always provide a detailed, descriptive prompt for best results.
Most models support text-to-video. Some also support image-to-video (provide a referenceImageUrl).`,
		inputSchema: z.object({
			prompt: z
				.string()
				.min(1)
				.max(4000)
				.describe(
					'A detailed description of the video to generate. Be specific about subject, action, setting, style, lighting, mood, and camera movement. Longer, more descriptive prompts produce better results.'
				),
			model: z
				.enum([
					'openai/sora-2-pro',
					'google/veo-3.1',
					'google/veo-3.1-fast',
					'google/veo-3.1-lite',
					'kwaivgi/kling-v3.0-pro',
					'kwaivgi/kling-v3.0-std',
					'kwaivgi/kling-video-o1',
					'minimax/hailuo-2.3',
					'alibaba/wan-2.7',
					'alibaba/wan-2.6',
					'bytedance/seedance-2.0',
					'bytedance/seedance-2.0-fast',
					'bytedance/seedance-1-5-pro',
					'alibaba/happyhorse-1.1',
					'x-ai/grok-imagine-video'
				])
				.default('google/veo-3.1-fast')
				.optional()
				.describe('The video model to use. Defaults to google/veo-3.1-fast.'),
			duration: z
				.number()
				.int()
				.min(2)
				.max(60)
				.default(5)
				.optional()
				.describe('Video duration in seconds (2-60). Defaults to 5.'),
			aspectRatio: z
				.enum(['16:9', '9:16', '1:1', '4:3', '3:4'])
				.default('16:9')
				.optional()
				.describe(
					'Aspect ratio for the video. "16:9" is landscape, "9:16" is portrait, "1:1" is square. Defaults to 16:9.'
				),
			fps: z
				.number()
				.int()
				.min(12)
				.max(60)
				.default(24)
				.optional()
				.describe('Frames per second (12-60). Defaults to 24.'),
			referenceImageUrl: z
				.string()
				.url()
				.optional()
				.describe(
					'Optional URL of a reference image to use as the starting frame for image-to-video generation. Not all models support this.'
				),
			n: z
				.number()
				.int()
				.min(1)
				.max(2)
				.default(1)
				.optional()
				.describe('Number of video variants to generate (1-2). Defaults to 1.')
		}),
		execute: async ({
			prompt,
			model: modelId,
			duration,
			aspectRatio,
			fps,
			referenceImageUrl,
			n
		}: {
			prompt: string;
			model?: VideoModelId;
			duration?: number;
			aspectRatio?: string;
			fps?: number;
			referenceImageUrl?: string;
			n?: number;
		}) => {
			const selectedModel = modelId || 'google/veo-3.1-fast';

			try {
				const videoModel = openrouter.videoModel(selectedModel);
				const result = await experimental_generateVideo({
					model: videoModel,
					prompt,
					n: n ?? 1,
					aspectRatio,
					duration,
					fps,
					...(referenceImageUrl
						? {
								inputReferences: [
									{
										type: 'image' as const,
										data: referenceImageUrl
									}
								]
							}
						: {})
				});

				const urls: string[] = [];

				for (const video of result.videos) {
					const filename = generateFilename();
					const filePath = path.join(OUTPUT_DIR, filename);
					fs.writeFileSync(filePath, video.uint8Array);
					urls.push(`/generated-videos/${filename}`);
				}

				return {
					model: selectedModel,
					prompt,
					videos: urls.map((url) => ({
						url,
						markdown: `[Generated video](${url})`
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
					error: `Video generation failed: ${message}`,
					model: selectedModel,
					prompt,
					suggestion:
						'Try a different model, simplify the prompt, or reduce the duration. Not all models support all aspect ratios or durations.'
				};
			}
		}
	} as any),

	listVideoModels: tool({
		description: 'List available AI video generation models with descriptions',
		inputSchema: z.object({}).describe('No parameters needed'),
		execute: async () => {
			return {
				models: MODEL_OPTIONS,
				default: 'google/veo-3.1-fast',
				recommendations: {
					quality: 'openai/sora-2-pro',
					balanced: 'google/veo-3.1-fast',
					fast: 'google/veo-3.1-lite',
					imageToVideo: 'minimax/hailuo-2.3',
					fullControl: 'bytedance/seedance-2.0'
				}
			};
		}
	} as any)
};
