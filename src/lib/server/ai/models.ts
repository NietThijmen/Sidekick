import snapshot from '@opencode-ai/models/snapshot';

const providers = snapshot.providers;

export type ListedModel = {
	id: string;
	name: string;
	lab: string;
	inputCost: number;
	outputCost: number;
	tier: 1 | 2 | 3 | 4 | 5;
};

function formatLab(lab: string): string {
	const map: Record<string, string> = {
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		google: 'Google',
		deepseek: 'DeepSeek',
		'meta-llama': 'Meta',
		mistral: 'Mistral',
		xai: 'xAI',
		cohere: 'Cohere',
		perplexity: 'Perplexity',
		ai21: 'AI21',
		alibaba: 'Alibaba',
		amazon: 'Amazon'
	};
	return map[lab] ?? lab.charAt(0).toUpperCase() + lab.slice(1);
}

function getTier(inputCost: number): ListedModel['tier'] {
	if (inputCost < 0.3) return 1;
	if (inputCost < 1.5) return 2;
	if (inputCost < 5) return 3;
	if (inputCost < 15) return 4;
	return 5;
}

export function listModels(): ListedModel[] {
	const orProvider = providers['openrouter'];
	if (!orProvider?.models) return [];

	const models: ListedModel[] = [];

	for (const [modelId, model] of Object.entries(orProvider.models)) {
		if (!model.cost) continue;
		const lab = modelId.includes('/') ? modelId.split('/')[0] : 'other';

		models.push({
			id: modelId,
			name: model.name ?? modelId,
			lab: formatLab(lab),
			inputCost: model.cost.input,
			outputCost: model.cost.output,
			tier: getTier(model.cost.input)
		});
	}

	models.sort((a, b) => a.inputCost - b.inputCost);
	return models;
}

export function calculateCost(
	modelId: string,
	inputTokens: number,
	outputTokens: number
): number | undefined {
	const openrouterProvider = providers['openrouter'];
	let cost = openrouterProvider?.models?.[modelId]?.cost;

	if (!cost) {
		const [providerKey, ...rest] = modelId.split('/');
		const modelName = rest.join('/');
		const provider = providers[providerKey];
		cost = provider?.models?.[modelName]?.cost;
	}

	if (!cost) return undefined;

	const inputCost = (inputTokens / 1_000_000) * cost.input;
	const outputCost = (outputTokens / 1_000_000) * cost.output;

	return inputCost + outputCost;
}
