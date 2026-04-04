import { DiskSkill } from './skills/DiskSkill.js';
import { ConsoleSkill } from './skills/ConsoleSkill.js';
import { RadarSkill } from './skills/RadarSkill.js';
import { GlobSkill } from './skills/GlobSkill.js';
import { PulseSkill } from './skills/PulseSkill.js';
import { InquirySkill } from './skills/InquirySkill.js';
import { AwaitSkill } from './skills/AwaitSkill.js';
import { WebScoutSkill } from './skills/WebScoutSkill.js';
import { ConnectMcpSkill } from './skills/ConnectMcpSkill.js';
import { CodeAwarenessSkill } from './skills/CodeAwarenessSkill.js';
import { TemporalSyncSkill } from './skills/TemporalSyncSkill.js';
import { AgenticSwarmSkill } from './skills/AgenticSwarmSkill.js';
import { TaskSkill } from './skills/TaskSkill.js';
import { RelaySkill } from './skills/RelaySkill.js';
import { InsightSkill } from './skills/InsightSkill.js';
import { MemoryStore } from './memories/MemoryStore.js';
import { TokenEstimator } from './utils/TokenEstimator.js';
import { BaseProvider, ToolDefinition } from './providers/BaseProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { AnthropicProvider } from './providers/AnthropicProvider.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { MockProvider } from './providers/MockProvider.js';
import { PermissionManager } from './PermissionManager.js';
import { SelferConfig } from './utils/ConfigManager.js';

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

  constructor(config: ThinkingCoreConfig, selferConfig?: SelferConfig) {
    this.config = config;
    this.history = [];
    this.skills = new Map();
    this.memory = new MemoryStore();
    this.permissionManager = new PermissionManager();
    
    // Select Provider based on persistent config or manual override
    const providerType = selferConfig?.provider || (config.model.includes('claude') ? 'anthropic' : (config.model.includes('gpt') ? 'openai' : 'ollama'));
    const model = selferConfig?.model || config.model;

    if (config.model === 'mock') {
      this.provider = new MockProvider();
    } else if (providerType === 'anthropic' && (selferConfig?.anthropicKey || config.apiKey)) {
      this.provider = new AnthropicProvider(selferConfig?.anthropicKey || config.apiKey!, model);
    } else if (providerType === 'openai' && (selferConfig?.openaiKey || config.apiKey)) {
      this.provider = new OpenAIProvider(selferConfig?.openaiKey || config.apiKey!, model);
    } else {
      this.provider = new OllamaProvider(selferConfig?.ollamaEndpoint, model);
    }

    // Register skills (Phase 2 Expanded Set)
    this.registerSkill(new DiskSkill());
    this.registerSkill(new ConsoleSkill());
    this.registerSkill(new RadarSkill());
    this.registerSkill(new GlobSkill());
    this.registerSkill(new PulseSkill());
    this.registerSkill(new InquirySkill());
    this.registerSkill(new AwaitSkill());
    this.registerSkill(new WebScoutSkill());
    this.registerSkill(new ConnectMcpSkill());
    this.registerSkill(new CodeAwarenessSkill());
    this.registerSkill(new TemporalSyncSkill());
    this.registerSkill(new AgenticSwarmSkill());
    this.registerSkill(new TaskSkill());
    this.registerSkill(new RelaySkill());
    this.registerSkill(new InsightSkill());
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

  public async executeSkillDirect(skillName: string, input: any) {
    const skill = this.skills.get(skillName);
    if (!skill) return { content: `Unknown skill: ${skillName}`, isError: true };
    return await skill.execute(input);
  }

  public getSkillList(): { name: string, description: string }[] {
    return Array.from(this.skills.values()).map(s => ({
      name: s.name,
      description: s.description
    }));
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public getModelName(): string {
    return this.config.model;
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
