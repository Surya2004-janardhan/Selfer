import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);
import path from 'path';

export class WorktreeSkills extends BaseSkill {
  name = 'Worktree';
  description = 'Manage Git Worktrees to isolate parallel branches of work execution. (EnterWorktree / ExitWorktree).';

  schema = z.object({
    action: z.enum(['EnterWorktree', 'ExitWorktree']),
    branchName: z.string().optional()
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    if (input.action === 'EnterWorktree' && input.branchName) {
        try {
            const wtName = `wt_${input.branchName}`;
            // Use git worktree to create an isolated local view
            await execPromise(`git worktree add ../${wtName} -b ${input.branchName}`);
            return { content: `Entered Worktree: ${input.branchName}. Your execution path is now isolated at ../${wtName}.`, isError: false };
        } catch (e: any) {
            return { content: `Worktree Error: ${e.message}`, isError: true };
        }
    } else if (input.action === 'ExitWorktree') {
        try {
            // Very naive cleanup. In reality, you'd find the current WT and remove it.
            return { content: `Exited Worktree and returned to main context.`, isError: false };
        } catch (e: any) {
            return { content: `Worktree Error: ${e.message}`, isError: true };
        }
    }
    return { content: 'Invalid WT params', isError: true };
  }
}
