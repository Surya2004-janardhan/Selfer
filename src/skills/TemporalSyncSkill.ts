import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

/**
 * TemporalSyncSkill.ts
 * Logic for scheduling recurring or delayed tasks.
 * (Ported and renamed from ScheduleCronTool)
 */
export class TemporalSyncSkill extends BaseSkill {
  name = 'TemporalSyncSkill';
  description = 'Skill for scheduling future or recurring Selfer tasks/commands.';

  schema = z.object({
    cron: z.string().describe('The cron expression for scheduling.'),
    command: z.string().describe('The command to execute.'),
    label: z.string().optional().describe('Label for the scheduled task.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      // Phase 2: Mock schedule creation
      return { content: `Successfully scheduled task "${input.label || input.command}" with cron: ${input.cron}.`, isError: false };
    } catch (error: any) {
      return { content: `Temporal Sync Error: ${error.message}`, isError: true };
    }
  }
}
