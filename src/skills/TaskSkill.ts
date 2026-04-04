import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

/**
 * TaskSkill.ts
 * Logic for long-running agentic tasks.
 * (Ported and renamed from TaskCreateTool)
 */
export class TaskSkill extends BaseSkill {
  name = 'TaskSkill';
  description = 'Skill for creating, tracking, and updating long-running Selfer goals.';

  schema = z.object({
    id: z.string().optional().describe('Unique identifier for the task.'),
    title: z.string().describe('The title of the task.'),
    description: z.string().describe('Detailed description for the sub-agent.'),
    status: z.enum(['active', 'completed', 'blocked']).default('active')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      // Phase 2: Mock task management
      return { 
        content: `Successfully managed task: "${input.title}" (Status: ${input.status}).`,
        isError: false,
        metadata: { task_id: input.id || `task_${crypto.randomUUID()}` }
      };
    } catch (error: any) {
      return { content: `Task System Error: ${error.message}`, isError: true };
    }
  }
}
