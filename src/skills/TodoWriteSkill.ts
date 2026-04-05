import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fs from 'fs/promises';
import path from 'path';

export class TodoWriteSkill extends BaseSkill {
  name = 'TodoWrite';
  description = 'Writes a specific task or TODO locally so the agent remembers to follow up on it in a future session.';

  schema = z.object({
    todo: z.string().describe('The task description to remember.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
      const todoPath = path.join(process.cwd(), '.selfer_todos.md');
      try {
          await fs.appendFile(todoPath, `- [ ] ${input.todo}\n`, 'utf8');
          return { content: `Successfully saved Todo.`, isError: false };
      } catch (e: any) {
          return { content: `Error saving: ${e.message}`, isError: true };
      }
  }
}
