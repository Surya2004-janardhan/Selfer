import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fg from 'fast-glob';

export class GlobSkill extends BaseSkill {
  name = 'Glob';
  description = 'Skill for finding files in the workspace using glob patterns (e.g. "**/*.ts").';

  schema = z.object({
    pattern: z.string().describe('The glob pattern to match.'),
    cwd: z.string().default('.').describe('The directory to search in.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      const entries = await fg(input.pattern, { cwd: input.cwd, absolute: false });
      return { content: `Found ${entries.length} files:\n${entries.join('\n')}`, isError: false };
    } catch (error: any) {
      return { content: `Glob Error: ${error.message}`, isError: true };
    }
  }
}
