import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

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
      const absolutePath = path.resolve(process.cwd(), input.filePath);

      if (input.action === 'diagnostics') {
        try {
          const { stdout, stderr } = await execPromise(`npx tsc --noEmit ${absolutePath}`);
          const output = `${stdout}\n${stderr}`.trim();
          return {
            content: output.length > 0 ? output : `No diagnostics reported for ${input.filePath}.`,
            isError: false
          };
        } catch (e: any) {
          const output = `${e?.stdout || ''}\n${e?.stderr || ''}`.trim();
          return {
            content: output.length > 0 ? output : `Diagnostics failed: ${e.message}`,
            isError: false
          };
        }
      }

      const content = await fs.readFile(absolutePath, 'utf-8');
      const lines = content.split('\n');
      const targetLine = typeof input.line === 'number' && input.line >= 0 ? input.line : 0;
      const source = lines[targetLine] || lines.find(Boolean) || '';
      const fallbackWord = source.match(/[A-Za-z_][A-Za-z0-9_]*/)?.[0] || '';
      const symbol = fallbackWord;

      if (!symbol) {
        return { content: `Could not infer symbol for ${input.action} in ${input.filePath}.`, isError: true };
      }

      if (input.action === 'definition') {
        const defRegex = new RegExp(`\\b(function|class|interface|type|const|let|var|enum)\\s+${symbol}\\b`);
        for (let i = 0; i < lines.length; i++) {
          if (defRegex.test(lines[i])) {
            return {
              content: `Definition for ${symbol} found at ${input.filePath}:${i + 1}\n${lines[i].trim()}`,
              isError: false
            };
          }
        }
        return { content: `Definition for ${symbol} not found in ${input.filePath}.`, isError: false };
      }

      // references
      const escaped = symbol.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const refRegex = new RegExp(`\\b${escaped}\\b`, 'g');
      const hits: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (refRegex.test(lines[i])) {
          hits.push(`${input.filePath}:${i + 1} ${lines[i].trim()}`);
        }
        if (hits.length >= 20) break;
      }

      return {
        content: hits.length > 0
          ? `References for ${symbol}:\n${hits.join('\n')}`
          : `No references for ${symbol} found in ${input.filePath}.`,
        isError: false
      };
    } catch (error: any) {
      return { content: `LSP Error: ${error.message}`, isError: true };
    }
  }
}
