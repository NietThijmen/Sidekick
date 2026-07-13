import { json } from '@sveltejs/kit';
import { listModels } from '$lib/server/ai/models';

export function GET() {
	return json(listModels());
}
