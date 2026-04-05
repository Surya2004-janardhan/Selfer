import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

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
    // In a real TUI, this would trigger an input field.
    // For Phase 2/Loop, we return the question as the content.
    return { 
      content: `Selfer Inquiry: ${input.question}`, 
      isError: false,
      metadata: { awaits_input: true } 
    };
  }
}
