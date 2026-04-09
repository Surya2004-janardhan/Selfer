import { execChildProcess } from './execUtils.js';
import path from 'path';
import fs from 'fs';

export class GitUtils {
  static async isGit(): Promise<boolean> {
    try {
      const { stdout } = await execChildProcess('git rev-parse --is-inside-work-tree');
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  static async getBranch(): Promise<string> {
    try {
      const { stdout } = await execChildProcess('git rev-parse --abbrev-ref HEAD');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  static async getStatus(): Promise<string> {
    try {
      const { stdout } = await execChildProcess('git status --short');
      return stdout.trim() || '(clean)';
    } catch {
      return 'unknown';
    }
  }

  static async getRecentCommits(n = 5): Promise<string> {
    try {
      const { stdout } = await execChildProcess(`git log --oneline -n ${n}`);
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  static async getGitRoot(): Promise<string | null> {
    try {
      const { stdout } = await execChildProcess('git rev-parse --show-toplevel');
      return stdout.trim();
    } catch {
      return null;
    }
  }
}
