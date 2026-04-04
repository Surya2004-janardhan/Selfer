import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

export class AwaitSkill extends BaseSkill {
  name = 'AwaitSkill';
  description = 'Skill for pausing and waiting for a specified duration (in milliseconds).';

  schema = z.object({
    ms: z.number().describe('The duration to wait in milliseconds.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    await new Promise(resolve => setTimeout(resolve, input.ms));
    return { content: `Successfully waited for ${input.ms}ms.`, isError: false };
  }
}
