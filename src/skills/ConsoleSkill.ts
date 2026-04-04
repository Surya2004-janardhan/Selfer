import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill';

const execPromise = promisify(exec);

export class ConsoleSkill extends BaseSkill {
  name = 'ConsoleSkill';
  description = 'Skill for executing safe shell commands in the local terminal environment.';
  
  schema = z.object({
    command: z.string().describe('The shell command to execute.'),
    timeout: z.number().default(30000).optional().describe('Maximum execution time in ms.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    // Security layer: Check for dangerous commands (Phase 2 core improvement)
    const dangerousCommands = ['rm -rf /', 'mkfs', 'dd'];
    if (dangerousCommands.some(cmd => input.command.includes(cmd))) {
      return { content: 'Security Error: Dangerous command blocked.', isError: true };
    }

    try {
      const { stdout, stderr } = await execPromise(input.command, { timeout: input.timeout });
      if (stderr) {
        return { content: `Execution result (stderr): ${stderr}`, isError: false };
      }
      return { content: stdout, isError: false };
    } catch (error: any) {
      return { content: `Shell Error: ${error.message}`, isError: true };
    }
  }
}
