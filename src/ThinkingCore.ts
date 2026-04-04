import { DiskSkill } from './skills/DiskSkill.js';
import { ConsoleSkill } from './skills/ConsoleSkill.js';
import { RadarSkill } from './skills/RadarSkill.js';
import { PulseSkill } from './skills/PulseSkill.js';
import { MemoryStore } from './memories/MemoryStore.js';
import { TokenEstimator } from './utils/TokenEstimator.js';

export interface ThinkingCoreConfig {
  model: string;
  cwd: string;
  maxTurns?: number;
}

export interface SelferMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * ThinkingCore.ts
 * The primary AI orchestration loop for Project Selfer.
 */
export class ThinkingCore {
  private config: ThinkingCoreConfig;
  private history: SelferMessage[];
  private skills: Map<string, any>;
  private memory: MemoryStore;

  constructor(config: ThinkingCoreConfig) {
    this.config = config;
    this.history = [];
    this.skills = new Map();
    this.memory = new MemoryStore();
    
    // Register renamed skills
    this.registerSkill(new DiskSkill());     // FileSystem (Renamed Disk)
    this.registerSkill(new ConsoleSkill());  // Shell (Renamed Console)
    this.registerSkill(new RadarSkill());    // Search (Renamed Radar)
    this.registerSkill(new PulseSkill());    // Diagnostic
  }

  private registerSkill(skill: any) {
    this.skills.set(skill.name, skill);
  }

  async initialize() {
    await this.memory.initialize();
  }

  async *submitMessage(prompt: string): AsyncGenerator<any, void, unknown> {
    const userMsg: SelferMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    };
    this.history.push(userMsg);

    yield {
      type: 'thinking',
      content: `Selfer (Thinking) with model: ${this.config.model}...`
    };

    // Logic for Phase 2: Integrated Capability execution
    // (Actual tool loops would go here in Phase 3 after UI polish)
    
    const responseMsg: SelferMessage = {
      role: 'assistant',
      content: 'Phase 2 capabilities (Disk, Console, Radar, Pulse) have been integrated and renamed. Ready for Phase 3 UI development.',
      timestamp: new Date().toISOString()
    };
    this.history.push(responseMsg);

    yield {
      type: 'assistant',
      content: responseMsg.content,
      tokens: TokenEstimator.estimateTotal(this.history)
    };
  }
}
