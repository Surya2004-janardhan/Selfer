import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

export class FileWriteSkill extends BaseSkill {
  name = 'FileWrite';
  description = 'Writes content to a file in the local workspace. Use this instead of running echo/cat > commands.';

  schema = z.object({
    absolute_path: z.string().describe('The absolute path to the file to write to.'),
    content: z.string().describe('The content to write to the file.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const fullPath = path.resolve(process.cwd(), input.absolute_path);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, input.content, 'utf-8');
      return { content: `Successfully wrote to ${input.absolute_path}`, isError: false };
    } catch (error: any) {
      return { content: `FileWrite Error: ${error.message}`, isError: true };
    }
  }
}


