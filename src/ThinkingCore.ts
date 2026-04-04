import { DiskSkill } from './skills/DiskSkill.js';
import { ConsoleSkill } from './skills/ConsoleSkill.js';
import { RadarSkill } from './skills/RadarSkill.js';
import { PulseSkill } from './skills/PulseSkill.js';
import { MemoryStore } from './memories/MemoryStore.js';
import { TokenEstimator } from './utils/TokenEstimator.js';
import { BaseProvider, ToolDefinition } from './providers/BaseProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { AnthropicProvider } from './providers/AnthropicProvider.js';
import { PermissionManager } from './PermissionManager.js';

export interface ThinkingCoreConfig {
  model: string;
  cwd: string;
  maxTurns?: number;
  apiKey?: string;
}

export interface SelferMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  tool_use_id?: string;
}

/**
 * ThinkingCore.ts
 * The primary AI orchestration loop for Project Selfer.
 * Handles the logic of querying models and executing skills.
 */
export class ThinkingCore {
  private config: ThinkingCoreConfig;
  private history: SelferMessage[];
  private skills: Map<string, any>;
  private memory: MemoryStore;
  private provider: BaseProvider;
  private permissionManager: PermissionManager;

  constructor(config: ThinkingCoreConfig) {
    this.config = config;
    this.history = [];
    this.skills = new Map();
    this.memory = new MemoryStore();
    this.permissionManager = new PermissionManager();
    
    // Select Provider
    if (config.model.includes('claude') && config.apiKey) {
      this.provider = new AnthropicProvider(config.apiKey, config.model);
    } else {
      this.provider = new OllamaProvider();
    }

    // Register skills
    this.registerSkill(new DiskSkill());
    this.registerSkill(new ConsoleSkill());
    this.registerSkill(new RadarSkill());
    this.registerSkill(new PulseSkill());
  }

  private registerSkill(skill: any) {
    this.skills.set(skill.name, skill);
  }

  async initialize() {
    await this.memory.initialize();
  }

  private getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.skills.values()).map(skill => ({
      name: skill.name,
      description: skill.description,
      input_schema: (skill.schema as any)._def // Simplified extraction for Phase 1
    }));
  }

  async *submitMessage(prompt: string): AsyncGenerator<any, void, unknown> {
    this.history.push({
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    });

    let turns = 0;
    const maxTurns = this.config.maxTurns ?? 10;

    while (turns < maxTurns) {
      turns++;

      yield {
        type: 'thinking',
        content: `Thinking... (Turn ${turns}/${maxTurns})`
      };

      const response = await this.provider.generate(
        this.history as any,
        this.getToolDefinitions()
      );

      if (response.content) {
        this.history.push({
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString()
        });

        yield {
          type: 'assistant',
          content: response.content,
          tokens: response.tokensUsed
        };
      }

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const call of response.toolCalls) {
          const skill = this.skills.get(call.name);
          if (skill) {
            // Security check
            const decision = await this.permissionManager.checkPermission(call.name, call.input);
            if (decision === 'deny') {
              this.history.push({
                role: 'tool',
                content: 'Error: Execution denied by user permission policy.',
                timestamp: new Date().toISOString(),
                tool_use_id: call.id
              } as any);
              continue;
            }

            yield {
              type: 'progress',
              content: `Executing skill: ${call.name}...`
            };

            const result = await skill.execute(call.input);
            
            this.history.push({
              role: 'tool',
              content: result.content,
              timestamp: new Date().toISOString(),
              tool_use_id: call.id
            } as any);

            yield {
              type: 'result',
              content: `Skill ${call.name} finished.`,
              isError: result.isError
            };
          }
        }
        // Continue the loop to let the model react to tool results
        continue;
      }

      // No more tool calls, exit loop
      break;
    }
  }
}
