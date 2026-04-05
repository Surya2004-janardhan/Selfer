import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

export class FileReadSkill extends BaseSkill {
  name = 'FileRead';
  description = 'Reads the contents of a file in the local workspace. Use this instead of running cat/head/tail commands.';

  schema = z.object({
    absolute_path: z.string().describe('The absolute path to the file to read.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const fullPath = path.resolve(process.cwd(), input.absolute_path);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return { content, isError: false };
    } catch (error: any) {
      return { content: `FileRead Error: ${error.message}`, isError: true };
    }
  }
}
