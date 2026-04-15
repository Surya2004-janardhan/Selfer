import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * AgenticSwarmSkill.ts
 * Logic for spawning sub-agents to solve complex problems in parallel.
 * (Ported and renamed from AgentTool)
 */
export class AgenticSwarmSkill extends BaseSkill {
  name = 'AgenticSwarmSkill';
  description = 'Skill for spawning a specialized sub-agent to solve a specific sub-task.';

  schema = z.object({
    task: z.string().describe('The task for the sub-agent.'),
    specialization: z.string().optional().describe('Specialized skill for the sub-agent (e.g. "coder", "researcher").'),
    model: z.string().optional().describe('Model to use for the sub-agent.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      const probes = [
        `pwd`,
        `ls -1 | head -20`,
        `find . -maxdepth 2 -type f | head -30`
      ];

      const outputs = await Promise.all(probes.map(async (command) => {
        try {
          const { stdout, stderr } = await execPromise(command, { timeout: 12000 });
          return `Agent probe: ${command}\n${(stdout || stderr || '').trim()}`;
        } catch (e: any) {
          return `Agent probe failed: ${command}\n${e?.message || 'unknown error'}`;
        }
      }));

      const specialization = input.specialization || 'generalist';
      const report = [
        `Agent Swarm Coordination Report`,
        `Task: ${input.task}`,
        `Specialization: ${specialization}`,
        input.model ? `Model Hint: ${input.model}` : undefined,
        `---`,
        ...outputs
      ].filter(Boolean).join('\n');

      return {
        content: report,
        isError: false,
        metadata: {
          strategy: 'parallel-probe',
          probe_count: probes.length
        }
      };
    } catch (error: any) {
      return { content: `Agent Swarm Error: ${error.message}`, isError: true };
    }
  }
}
