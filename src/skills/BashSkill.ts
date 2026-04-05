import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

const execPromise = promisify(exec);

export class BashSkill extends BaseSkill {
  name = 'Bash';
  description = 'Executes a given bash command and returns its output.';
  
  schema = z.object({
    command: z.string().describe('The shell command to execute.'),
    timeout: z.number().default(30000).optional().describe('Maximum execution time in ms.'),
    run_in_background: z.boolean().optional().describe("Run the command in the background without waiting for it to finish.")
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const dangerousCommands = ['rm -rf /', 'mkfs', 'dd'];
    if (dangerousCommands.some(cmd => input.command.includes(cmd))) {
      return { content: 'Security Error: Dangerous command blocked.', isError: true };
    }

    if (input.run_in_background) {
      exec(input.command);
      return { content: `Background task started: ${input.command}`, isError: false };
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
