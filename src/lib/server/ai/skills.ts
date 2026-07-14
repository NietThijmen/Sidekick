import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';
import { skill as skillTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const AI_DIR = path.resolve('assets/ai');
const SKILLS_DIR = path.join(AI_DIR, 'skills');

export interface Skill {
	id: string;
	name: string;
	description: string;
	triggers: string[];
	content: string;
}

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) {
		return { data: {}, body: content };
	}

	const frontmatter = match[1];
	const body = match[2];
	const data: Record<string, unknown> = {};

	let currentKey: string | null = null;
	for (const rawLine of frontmatter.split('\n')) {
		const line = rawLine.trimEnd();
		if (line.startsWith('- ')) {
			if (currentKey) {
				if (!Array.isArray(data[currentKey])) {
					data[currentKey] = [];
				}
				(data[currentKey] as string[]).push(line.slice(2).trim());
			}
			continue;
		}

		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim();
		const value = line.slice(colonIndex + 1).trim();

		if (value === '') {
			data[key] = [];
			currentKey = key;
		} else {
			data[key] = value;
			currentKey = null;
		}
	}

	return { data, body };
}

export function loadSystemPrompt(): string {
	const filePath = path.join(AI_DIR, 'system.md');
	if (!fs.existsSync(filePath)) {
		return '';
	}
	return fs.readFileSync(filePath, 'utf-8').trim();
}

export function loadSkills(): Skill[] {
	if (!fs.existsSync(SKILLS_DIR)) {
		return [];
	}

	const files = fs.readdirSync(SKILLS_DIR).filter((file) => file.endsWith('.md'));

	return files.map((file) => {
		const id = file.replace(/\.md$/, '');
		const raw = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf-8');
		const { data, body } = parseFrontmatter(raw);

		const triggers = Array.isArray(data.triggers)
			? data.triggers.map(String)
			: typeof data.triggers === 'string'
				? data.triggers.split(',').map((t) => t.trim())
				: [];

		return {
			id,
			name: String(data.name || id),
			description: String(data.description || ''),
			triggers,
			content: body.trim()
		};
	});
}

export async function loadCustomSkills(userId: string): Promise<Skill[]> {
	const customSkills = await db
		.select({
			id: skillTable.id,
			name: skillTable.name,
			description: skillTable.description,
			triggers: skillTable.triggers,
			content: skillTable.content
		})
		.from(skillTable)
		.where(and(eq(skillTable.userId, userId), eq(skillTable.enabled, true)));

	return customSkills.map((s) => ({
		id: `custom:${s.id}`,
		name: s.name,
		description: s.description ?? '',
		triggers: s.triggers,
		content: s.content
	}));
}

export async function loadAllSkills(userId?: string): Promise<Skill[]> {
	const builtIn = loadSkills();
	if (!userId) return builtIn;

	const customSkills = await loadCustomSkills(userId);
	return [...builtIn, ...customSkills];
}

export function findActiveSkills(message: string, skills: Skill[]): Skill[] {
	if (!message) {
		return [];
	}
	const lowerMessage = message.toLowerCase();
	return skills.filter((skill) =>
		skill.triggers
			.filter((trigger): trigger is string => typeof trigger === 'string')
			.some((trigger) => lowerMessage.includes(trigger.toLowerCase()))
	);
}

export function buildSystemPrompt(basePrompt: string, skills: Skill[]): string {
	if (skills.length === 0) {
		return basePrompt;
	}

	const skillSections = skills
		.map((skill) => `## Skill: ${skill.name}\n\n${skill.content}`)
		.join('\n\n');

	return `${basePrompt}\n\n${skillSections}`;
}
