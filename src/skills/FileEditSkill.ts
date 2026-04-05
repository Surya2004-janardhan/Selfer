import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

export class FileEditSkill extends BaseSkill {
  name = 'FileEdit';
  description = 'Edits a file in the local workspace by replacing a target string with a replacement string.';

  schema = z.object({
    absolute_path: z.string().describe('The absolute path to the file to edit.'),
    target_string: z.string().describe('The exact string to be replaced in the file.'),
    replacement_string: z.string().describe('The exact string to replace the target with.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const fullPath = path.resolve(process.cwd(), input.absolute_path);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      if (!content.includes(input.target_string)) {
          return { content: `FileEdit Error: target_string not found in ${input.absolute_path}`, isError: true };
      }
      const newContent = content.replace(input.target_string, input.replacement_string);
      await fs.writeFile(fullPath, newContent, 'utf-8');
      return { content: `Successfully edited ${input.absolute_path}`, isError: false };
    } catch (error: any) {
      return { content: `FileEdit Error: ${error.message}`, isError: true };
    }
  }
}
