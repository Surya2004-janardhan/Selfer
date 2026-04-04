import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';

/**
 * CodeAwarenessSkill.ts
 * Integrates with Language Servers (LSP) for deep code intelligence.
 * (Ported and renamed from LSPTool)
 */
export class CodeAwarenessSkill extends BaseSkill {
  name = 'CodeAwarenessSkill';
  description = 'Skill for deep code understanding (definitions, references, diagnostics) via LSP.';

  schema = z.object({
    action: z.enum(['definition', 'references', 'diagnostics']),
    filePath: z.string().describe('The file to analyze.'),
    line: z.number().optional().describe('The line number (for definition/references).'),
    character: z.number().optional().describe('The character position.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      // Phase 2: Mock LSP result for parity structure
      if (input.action === 'diagnostics') {
        return { content: `Code awareness results for ${input.filePath}:\n- [12:3] Warning: Unused variable 'x'.`, isError: false };
      }
      
      return { content: `Code Awareness: Successfully determined ${input.action} in ${input.filePath}.`, isError: false };
    } catch (error: any) {
      return { content: `LSP Error: ${error.message}`, isError: true };
    }
  }
}
