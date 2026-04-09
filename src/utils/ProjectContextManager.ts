import { GitUtils } from './GitUtils.js';
import fs from 'fs/promises';
import path from 'path';

export class ProjectContextManager {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  async getContextPrompt(): Promise<string> {
    const sections: string[] = [];

    // 1. Date Context
    sections.push(`Today's date is ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}.`);

    // 2. Git Context
    if (await GitUtils.isGit()) {
      const branch = await GitUtils.getBranch();
      const status = await GitUtils.getStatus();
      const commits = await GitUtils.getRecentCommits();
      
      sections.push(`## Git Environment
Current Branch: ${branch}
Status:
${status}

Recent Commits:
${commits}`);
    }

    // 3. Project Documentation (SELFER.md)
    const selferMdPath = path.join(this.cwd, 'SELFER.md');
    try {
      const content = await fs.readFile(selferMdPath, 'utf-8');
      sections.push(`## Project Guidelines (from SELFER.md)\n${content}`);
    } catch {
      // Ignore if not present
    }

    return sections.join('\n\n');
  }
}
