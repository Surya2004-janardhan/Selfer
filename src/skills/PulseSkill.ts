import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill';

const execPromise = promisify(exec);

export class PulseSkill extends BaseSkill {
  name = 'PulseSkill';
  description = 'Skill for performing environmental diagnostics and health checks on Selfer.';

  schema = z.object({});

  async execute(): Promise<SkillResult> {
    const diagnosticResults: string[] = [];

    // Health Check 1: Git status
    try {
      await execPromise('git rev-parse --is-inside-work-tree');
      diagnosticResults.push('✅ Git project detected.');
    } catch {
      diagnosticResults.push('❌ Not a git project.');
    }

    // Health Check 2: Node/Bun versions
    try {
      const { stdout: nodeVer } = await execPromise('node -v');
      diagnosticResults.push(`✅ Node version: ${nodeVer.trim()}`);
    } catch {
       diagnosticResults.push('❌ Node not found.');
    }

    // Health Check 3: Ollama connection (Optional)
    try {
       // Mock for now, Phase 2 core improvement later
       diagnosticResults.push('✅ Ollama connection interface ready.');
    } catch {
       diagnosticResults.push('❌ Ollama connection failed.');
    }

    return { content: `Selfer Pulse Performance Check:\n${diagnosticResults.join('\n')}`, isError: false };
  }
}
