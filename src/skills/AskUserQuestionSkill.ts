import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * InquirySkill.ts
 * Allows the AI agent to ask the user a specific question.
 * (Ported and renamed from AskUserQuestionTool)
 */
export class AskUserQuestionSkill extends BaseSkill {
  name = 'AskUserQuestion';
  description = 'Skill for asking the user a clarifying question before proceeding.';

  schema = z.object({
    question: z.string().describe('The question to present to the user.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const pendingPath = path.join(os.homedir(), '.selfer', 'pending-question.json');
    await fs.mkdir(path.dirname(pendingPath), { recursive: true });
    await fs.writeFile(
      pendingPath,
      JSON.stringify({ question: input.question, timestamp: new Date().toISOString() }, null, 2),
      'utf8'
    );

    return { 
      content: `Selfer Inquiry: ${input.question}`, 
      isError: false,
      metadata: { awaits_input: true, pending_file: pendingPath } 
    };
  }
}
