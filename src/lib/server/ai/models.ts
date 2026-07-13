import snapshot from '@opencode-ai/models/snapshot';

const providers = snapshot.providers;

export function calculateCost(
	modelId: string,
	inputTokens: number,
	outputTokens: number
): number | undefined {
	const [providerKey, ...rest] = modelId.split('/');
	const modelName = rest.join('/');

	const provider = providers[providerKey];
	if (!provider?.models?.[modelName]?.cost) return undefined;

	const cost = provider.models[modelName].cost!;
	const inputCost = (inputTokens / 1_000_000) * cost.input;
	const outputCost = (outputTokens / 1_000_000) * cost.output;

	return inputCost + outputCost;
}
