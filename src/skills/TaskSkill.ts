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

  async execute(input: z.infer<typeof this.schema>, core?: any): Promise<SkillResult> {
    try {
      const taskManager = core?.getTaskManager();
      if (!taskManager) {
        return { content: 'Task System Error: TaskManager not initialized.', isError: true };
      }

      if (input.id) {
        const updated = await taskManager.updateTask(input.id, { 
            status: input.status,
            description: input.description 
        });
        if (!updated) return { content: `Task with ID ${input.id} not found.`, isError: true };
        return { content: `Updated task: ${updated.title} to ${updated.status}.`, isError: false };
      }

      const task = await taskManager.createTask(input.title, input.description);
      return { 
        content: `Successfully created persistent task: "${task.title}" (ID: ${task.id}).`,
        isError: false,
        metadata: { task_id: task.id }
      };
    } catch (error: any) {
      return { content: `Task System Error: ${error.message}`, isError: true };
    }
  }
}
