import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SelferMessage } from '../ThinkingCore.js';

export interface HistorySegment {
  sessionId: string;
  projectRoot: string;
  messages: SelferMessage[];
  timestamp: string;
}

/**
 * HistoryStore.ts
 * Manages persistent conversation history with session segmentation.
 * Parity with src-reference/history.ts.
 */
export class HistoryStore {
  private historyDir: string;
  private currentSessionId: string;

  constructor(sessionId: string = `session_${Math.random().toString(36).substring(7)}`) {
    this.historyDir = path.join(os.homedir(), '.selfer', 'history');
    this.currentSessionId = sessionId;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.historyDir, { recursive: true });
    } catch (error) {
      // Best effort
    }
  }

  async appendEntry(message: SelferMessage): Promise<void> {
    const sessionFile = path.join(this.historyDir, `${this.currentSessionId}.jsonl`);
    try {
      await fs.appendFile(sessionFile, JSON.stringify(message) + '\n', 'utf8');
      
      // Also append to a global index for cross-session analysis (Phase 6)
      const globalFile = path.join(this.historyDir, 'global.jsonl');
      const indexEntry = {
        sessionId: this.currentSessionId,
        project: process.cwd(),
        ...message
      };
      await fs.appendFile(globalFile, JSON.stringify(indexEntry) + '\n', 'utf8');
    } catch (error) {
      // Best effort
    }
  }

  async getSessionHistory(sessionId: string = this.currentSessionId): Promise<SelferMessage[]> {
    const sessionFile = path.join(this.historyDir, `${sessionId}.jsonl`);
    try {
      const content = await fs.readFile(sessionFile, 'utf8');
      return content
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  async getRecentSessions(limit: number = 5): Promise<{ sessionId: string, timestamp: number }[]> {
    try {
      const files = await fs.readdir(this.historyDir);
      const sessions = files
        .filter(f => f.endsWith('.jsonl') && f !== 'global.jsonl')
        .map(f => ({
          sessionId: f.replace('.jsonl', ''),
          timestamp: 0 // In real impl, use stat.mtime
        }));
      return sessions.slice(-limit);
    } catch {
      return [];
    }
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }
}
