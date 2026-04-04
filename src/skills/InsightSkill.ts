import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

/**
 * InsightSkill.ts
 * Logic for creating and reading high-level project summaries and briefs.
 * (Ported and renamed from BriefTool)
 */
export class InsightSkill extends BaseSkill {
  name = 'InsightSkill';
  description = 'Skill for generating or retrieving persistent project insights and briefs.';

  schema = z.object({
    action: z.enum(['read', 'write', 'update']),
    summary: z.string().optional().describe('The content for the brief or insight.'),
    key: z.string().default('main').describe('The unique identifier for the insight.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      // Phase 2: Mock insight management (Real memory in Phase 3)
      if (input.action === 'read') {
        return { content: `Insight for "${input.key}":\nThis project is a high-parity agent clone.`, isError: false };
      }
      return { content: `Successfully ${input.action}d project insight: "${input.key}".`, isError: false };
    } catch (error: any) {
      return { content: `Insight System Error: ${error.message}`, isError: true };
    }
  }
}
