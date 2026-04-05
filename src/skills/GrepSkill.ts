import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

export class GrepSkill extends BaseSkill {
  name = 'Grep';
  description = 'Skill for performing content search and pattern matching in the workspace.';

  schema = z.object({
    directory: z.string().default('.').describe('The directory to search in.'),
    query: z.string().describe('The search term or regex pattern.'),
    extensions: z.array(z.string()).optional().describe('Filter by file extensions (e.g. [".ts", ".js"]).')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const searchDir = path.resolve(process.cwd(), input.directory);
    const results: string[] = [];

    try {
      const traverse = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
              await traverse(entryPath);
            }
          } else {
            if (input.extensions && !input.extensions.includes(path.extname(entry.name))) continue;
            const content = await fs.readFile(entryPath, 'utf-8');
            if (content.includes(input.query)) {
              results.push(path.relative(process.cwd(), entryPath));
            }
          }
        }
      };

      await traverse(searchDir);
      return { content: `Search results for "${input.query}":\n${results.join('\n')}`, isError: false };
    } catch (error: any) {
      return { content: `Search Error: ${error.message}`, isError: true };
    }
  }
}
