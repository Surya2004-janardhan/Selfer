import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import { MemoryStore } from '../memories/MemoryStore.js';

/**
 * InsightSkill.ts
 * Logic for creating and reading high-level project summaries and briefs.
 * (Ported and renamed from BriefTool)
 */
export class SyntheticOutputSkill extends BaseSkill {
  name = 'SyntheticOutput';
  description = 'Skill for generating or retrieving persistent project insights and briefs.';

  schema = z.object({
    action: z.enum(['read', 'write', 'update']),
    summary: z.string().optional().describe('The content for the brief or insight.'),
    key: z.string().default('main').describe('The unique identifier for the insight.')
  });

  private memory = new MemoryStore();

  private normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      await this.memory.initialize();
      const key = this.normalizeKey(input.key);

      if (input.action === 'read') {
        const existing = await this.memory.load(key);
        if (!existing) {
          return { content: `No stored insight found for "${key}".`, isError: false };
        }
        return { content: `Insight for "${key}":\n${existing.value}`, isError: false };
      }

      if (!input.summary) {
        return { content: `Insight ${input.action} requires summary content.`, isError: true };
      }

      if (input.action === 'update') {
        const existing = await this.memory.load(key);
        const merged = existing?.value
          ? `${existing.value}\n\n[Update ${new Date().toISOString()}]\n${input.summary}`
          : input.summary;
        await this.memory.save(key, merged);
        return { content: `Updated project insight: "${key}".`, isError: false };
      }

      await this.memory.save(key, input.summary);
      return { content: `Wrote project insight: "${key}".`, isError: false };
    } catch (error: any) {
      return { content: `Insight System Error: ${error.message}`, isError: true };
    }
  }
}
