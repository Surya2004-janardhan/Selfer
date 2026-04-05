import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fs from 'fs/promises';

export class NotebookEditSkill extends BaseSkill {
  name = 'NotebookEdit';
  description = 'Tool for safely reading and modifying Jupyter Notebooks (.ipynb).';

  schema = z.object({
    action: z.enum(['read_cells', 'edit_cell']),
    filePath: z.string().describe('Path to the .ipynb file'),
    cellIndex: z.number().optional().describe('The index of the cell to read or edit.'),
    content: z.string().optional().describe('New content for the cell during edit_cell.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      const raw = await fs.readFile(input.filePath, 'utf-8');
      const notebook = JSON.parse(raw);

      if (input.action === 'read_cells') {
        const cells = notebook.cells.map((c: any, i: number) => `\n[Cell ${i}] (${c.cell_type}):\n${c.source.join('')}`).join('\n');
        return { content: cells, isError: false };
      }

      if (input.action === 'edit_cell' && input.cellIndex !== undefined && input.content !== undefined) {
        notebook.cells[input.cellIndex].source = input.content.split('\n').map((l: string) => l + '\n');
        await fs.writeFile(input.filePath, JSON.stringify(notebook, null, 2));
        return { content: `Successfully updated cell ${input.cellIndex} in ${input.filePath}`, isError: false };
      }

      return { content: 'Invalid parameters for NotebookEdit', isError: true };
    } catch (e: any) {
      return { content: `NotebookEdit Error: ${e.message}`, isError: true };
    }
  }
}
