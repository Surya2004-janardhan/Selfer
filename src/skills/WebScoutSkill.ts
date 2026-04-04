import { z } from 'zod';
import axios from 'axios';
import { BaseSkill, SkillResult } from './BaseSkill.js';

export class WebScoutSkill extends BaseSkill {
  name = 'WebScoutSkill';
  description = 'Skill for performing web searches and fetching page content.';

  schema = z.object({
    action: z.enum(['search', 'fetch']),
    query: z.string().optional().describe('Input for search action.'),
    url: z.string().optional().describe('Input for fetch action.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      if (input.action === 'fetch' && input.url) {
        const response = await axios.get(input.url, { timeout: 10000 });
        return { content: `Successfully fetched content from ${input.url}:\n${response.data.slice(0, 5000)}...`, isError: false };
      }
      
      if (input.action === 'search' && input.query) {
        // Phase 2: Mock search for parity structure
        return { content: `Search results for "${input.query}":\n- [Link 1](https://example.com/1): Result 1\n- [Link 2](https://example.com/2): Result 2`, isError: false };
      }
      
      throw new Error('Action missing input data.');
    } catch (error: any) {
      return { content: `WebScout Error: ${error.message}`, isError: true };
    }
  }
}
