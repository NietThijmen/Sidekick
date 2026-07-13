import { tool } from 'ai';
import { z } from 'zod';
import { loadSkills } from './skills';

export const aiTools = {
	getCurrentTime: tool({
		description: 'Get the current date and time in ISO format',
		parameters: z.object({
			unused: z.string().optional().describe('No parameters needed')
		}),
		execute: async () => {
			return { currentTime: new Date().toISOString() };
		}
	}),

	listAvailableSkills: tool({
		description: 'List all available skills that can be activated by trigger words',
		parameters: z.object({
			unused: z.string().optional().describe('No parameters needed')
		}),
		execute: async () => {
			const skills = loadSkills();
			return skills.map((skill) => ({
				name: skill.name,
				description: skill.description,
				triggers: skill.triggers
			}));
		}
	}),

	loadSkill: tool({
		description: 'Load the full content of a skill by its name',
		parameters: z.object({
			name: z.string().describe('The name of the skill to load')
		}),
		execute: async ({ name }: { name: string }) => {
			const skills = loadSkills();
			const skill = skills.find(
				(s) =>
					s.name.toLowerCase() === name.toLowerCase() ||
					s.id.toLowerCase() === name.toLowerCase()
			);
			if (!skill) {
				return { error: `Skill "${name}" not found` };
			}
			return {
				name: skill.name,
				description: skill.description,
				content: skill.content
			};
		}
	})
};
