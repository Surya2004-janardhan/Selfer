import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

const execPromise = promisify(exec);

export class REPLSkill extends BaseSkill {
  name = 'REPL';
  description = 'Execute interactive Node.js or Python code expressions to inspect state or generate data programmatically.';

  schema = z.object({
    language: z.enum(['node', 'python']).describe('The REPL language to use.'),
    code: z.string().describe('The code to execute.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const { language, code } = input;
    
    // Simple sanitized wrapper around shell eval
    const escapedCode = code.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    const cmd = language === 'node' 
      ? `node -e "${escapedCode}"`
      : `python3 -c "${escapedCode}"`;

    try {
      const { stdout, stderr } = await execPromise(cmd, { timeout: 10000 });
      if (stderr) return { content: `REPL Error Output:\n${stderr}`, isError: false }; // stderr happens often outside hard errors
      return { content: stdout || 'Execution completed with no output.', isError: false };
    } catch (error: any) {
      return { content: `REPL Exception: ${error.message}`, isError: true };
    }
  }
}
