/**
 * MemoryStore.ts
 * Logic for persistent memory of the Selfer AI agent.
 */

import fs from 'fs/promises';
import path from 'path';

export interface SelferMemory {
  id: string;
  key: string;
  value: string;
  timestamp: string;
}

export class MemoryStore {
  private memoryDir: string;

  constructor(memoryDir = 'memories') {
    this.memoryDir = path.resolve(process.cwd(), memoryDir);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.memoryDir, { recursive: true });
  }

  async save(key: string, value: string): Promise<void> {
    const memory: SelferMemory = {
      id: crypto.randomUUID(),
      key,
      value,
      timestamp: new Date().toISOString()
    };
    const memoryPath = path.join(this.memoryDir, `${key}.json`);
    await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
  }

  async load(key: string): Promise<SelferMemory | null> {
    const memoryPath = path.join(this.memoryDir, `${key}.json`);
    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async listAll(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.memoryDir);
      return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  async delete(key: string): Promise<boolean> {
    const memoryPath = path.join(this.memoryDir, `${key}.json`);
    try {
      await fs.unlink(memoryPath);
      return true;
    } catch {
      return false;
    }
  }

  async listDetailed(limit: number = 50): Promise<SelferMemory[]> {
    const keys = await this.listAll();
    const out: SelferMemory[] = [];

    for (const key of keys.slice(0, limit)) {
      const item = await this.load(key);
      if (item) out.push(item);
    }

    return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}
