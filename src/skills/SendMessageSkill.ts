import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

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

  private messageDir = path.join(os.homedir(), '.selfer', 'relay');

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      const relayId = `relay_${Math.random().toString(36).substring(7)}`;
      const recipient = input.recipient_id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const relayFile = path.join(this.messageDir, `${recipient}.jsonl`);
      await fs.mkdir(this.messageDir, { recursive: true });

      const entry = {
        relayId,
        recipientId: input.recipient_id,
        content: input.content,
        metadata: input.metadata || {},
        timestamp: new Date().toISOString()
      };
      await fs.appendFile(relayFile, JSON.stringify(entry) + '\n', 'utf8');

      return { 
        content: `Successfully relayed message to "${input.recipient_id}".`, 
        isError: false,
        metadata: { relay_id: relayId, relay_file: relayFile } 
      };
    } catch (error: any) {
      return { content: `Relay Error: ${error.message}`, isError: true };
    }
  }
}
