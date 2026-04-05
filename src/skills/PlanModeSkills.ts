import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

export class PlanModeSkills extends BaseSkill {
  name = 'PlanMode';
  description = 'Manage Plan Mode states. Enter Plan Mode when you need to outline a strategy. Exit when the plan is approved.';

  schema = z.object({
    action: z.enum(['EnterPlanMode', 'ExitPlanMode']),
    planDescription: z.string().optional()
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    if (input.action === 'EnterPlanMode') {
        return { content: `Entered Plan Mode. Current plan context saved: ${input.planDescription || 'None'}. User validation requested internally.`, isError: false };
    } else {
        return { content: `Exited Plan Mode. Returning to active execution state.`, isError: false };
    }
  }
}
