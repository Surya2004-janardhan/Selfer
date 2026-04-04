import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill';

export class DiskSkill extends BaseSkill {
  name = 'DiskSkill';
  description = 'High-performance skill for reading, writing, or editing files in the local workspace.';

  schema = z.object({
    action: z.enum(['read', 'write', 'edit']),
    filePath: z.string().describe('The absolute or relative path to the file.'),
    content: z.string().optional().describe('Input for write/edit actions.'),
    searchPattern: z.string().optional().describe('Text to search for during edit.'),
    replacePattern: z.string().optional().describe('Text to replace with during edit.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const fullPath = path.resolve(process.cwd(), input.filePath);

    try {
      switch (input.action) {
        case 'read': {
          const content = await fs.readFile(fullPath, 'utf-8');
          return { content, isError: false };
        }
        case 'write': {
          if (!input.content) throw new Error('Content is required for write action.');
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, input.content, 'utf-8');
          return { content: `Successfully wrote to ${input.filePath}`, isError: false };
        }
        case 'edit': {
          if (!input.searchPattern || input.replacePattern === undefined) {
            throw new Error('Search and replace patterns are required for edit action.');
          }
          const content = await fs.readFile(fullPath, 'utf-8');
          const newContent = content.replace(input.searchPattern, input.replacePattern);
          await fs.writeFile(fullPath, newContent, 'utf-8');
          return { content: `Successfully edited ${input.filePath}`, isError: false };
        }
      }
    } catch (error: any) {
      return { content: `FileSystem Error: ${error.message}`, isError: true };
    }
  }
}
