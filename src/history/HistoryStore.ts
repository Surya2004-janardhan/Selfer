import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SelferMessage } from '../ThinkingCore.js';

/**
 * HistoryStore.ts
 * Persistent JSONL-based conversation history.
 * Mirrors Claude Code's history.ts architecture.
 */
export class HistoryStore {
  private historyPath: string;

  constructor() {
    this.historyPath = path.join(os.homedir(), '.selfer', 'history.jsonl');
  }

  async appendEntry(message: SelferMessage, metadata?: any): Promise<void> {
    try {
      const entry = {
        ...message,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      };

      const entryString = JSON.stringify(entry) + '\n';
      const dir = path.dirname(this.historyPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Append entry (appendFile handles creation if missing)
      await fs.appendFile(this.historyPath, entryString, { mode: 0o600 });
    } catch (error) {
      console.error('Failed to append to history:', error);
    }
  }

  async loadRecent(limit: number = 20): Promise<SelferMessage[]> {
    try {
      if (!(await this.fileExists(this.historyPath))) return [];
      
      const content = await fs.readFile(this.historyPath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Take the last 'limit' lines and parse
      return lines
        .slice(-limit)
        .map(line => JSON.parse(line)) as SelferMessage[];
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  private async fileExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}
