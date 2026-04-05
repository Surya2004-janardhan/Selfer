import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

/**
 * RelaySkill.ts
 * Logic for sending messages across Selfer instances or sub-agents.
 * (Ported and renamed from SendMessageTool)
 */
export class SendMessageSkill extends BaseSkill {
  name = 'SendMessage';
  description = 'Skill for relaying messages and data streams across Selfer swarms.';

  schema = z.object({
    recipient_id: z.string().describe('The identifier for the recipient Selfer sub-agent.'),
    content: z.string().describe('The message content to relay.'),
    metadata: z.record(z.string(), z.any()).optional()
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      // Phase 2: Mock message relay
      return { 
        content: `Successfully relayed message to "${input.recipient_id}".`, 
        isError: false,
        metadata: { relay_id: `relay_${Math.random().toString(36).substring(7)}` } 
      };
    } catch (error: any) {
      return { content: `Relay Error: ${error.message}`, isError: true };
    }
  }
}
