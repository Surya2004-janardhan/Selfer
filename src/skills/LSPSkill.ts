import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
const execPromise = promisify(exec);

export class LSPSkill extends BaseSkill {
  name = 'LSP';
  description = 'Query the local Language Server Protocol (LSP) to get type definitions, references, or diagnostics for code.';

  schema = z.object({
    action: z.enum(['hover', 'references', 'diagnostics']),
    filePath: z.string().describe('The file to analyze.'),
    line: z.number().optional().describe('Line number (0-indexed).'),
    character: z.number().optional().describe('Character number (0-indexed).')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      const absolutePath = path.resolve(process.cwd(), input.filePath);

      if (input.action === 'diagnostics') {
        try {
          const { stdout, stderr } = await execPromise(`npx tsc --noEmit ${absolutePath}`);
          return { content: (stdout || stderr || 'No diagnostics issues found.').trim(), isError: false };
        } catch (e: any) {
          const output = `${e?.stdout || ''}\n${e?.stderr || ''}`.trim();
          return { content: output || `LSP diagnostics error: ${e.message}`, isError: false };
        }
      }

      const content = await fs.readFile(absolutePath, 'utf8');
      const lines = content.split('\n');
      const line = typeof input.line === 'number' && input.line >= 0 ? input.line : 0;
      const row = lines[line] || '';
      const char = typeof input.character === 'number' && input.character >= 0 ? input.character : 0;

      const tokenMatch = row.slice(char).match(/[A-Za-z_][A-Za-z0-9_]*/) || row.match(/[A-Za-z_][A-Za-z0-9_]*/);
      const symbol = tokenMatch?.[0];
      if (!symbol) {
        return { content: `No symbol found at ${input.filePath}:${line + 1}:${char + 1}.`, isError: true };
      }

      if (input.action === 'hover') {
        return {
          content: `Hover: symbol ${symbol} at ${input.filePath}:${line + 1}\n${row.trim()}`,
          isError: false
        };
      }

      const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'g');
      const refs: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          refs.push(`${input.filePath}:${i + 1} ${lines[i].trim()}`);
        }
        if (refs.length >= 30) break;
      }

      return {
        content: refs.length > 0
          ? `References for ${symbol}:\n${refs.join('\n')}`
          : `No references for ${symbol} found in ${input.filePath}.`,
        isError: false
      };
    } catch (e: any) {
      return { content: `LSP Error: ${e.message}`, isError: true };
    }
  }
}
