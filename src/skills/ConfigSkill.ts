import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class ConfigSkill extends BaseSkill {
  name = 'Config';
  description = 'Read or update Selfer/Claude configuration profiles.';

  schema = z.object({
    action: z.enum(['read', 'update']),
    key: z.string().optional().describe('The configuration key to read/update.'),
    value: z.string().optional().describe('The value to set.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
      const configPath = path.join(os.homedir(), '.selfer', 'config.json');
      let config: any = {};
      
      try {
          const raw = await fs.readFile(configPath, 'utf8');
          config = JSON.parse(raw);
      } catch (e) {
          // Ignore, use empty config
      }

      if (input.action === 'read') {
          if (input.key) return { content: String(config[input.key] || 'Not set'), isError: false };
          return { content: JSON.stringify(config, null, 2), isError: false };
      }

      if (input.action === 'update' && input.key && input.value !== undefined) {
          config[input.key] = input.value;
          await fs.mkdir(path.dirname(configPath), { recursive: true });
          await fs.writeFile(configPath, JSON.stringify(config, null, 2));
          return { content: `Updated config ${input.key} = ${input.value}`, isError: false };
      }

      return { content: 'Invalid action.', isError: true };
  }
}
