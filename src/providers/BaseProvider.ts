/**
 * BaseProvider.ts
 * Abstract interface for multi-model implementation.
 * Updated for Phase 5: Liquid Streaming & Real-time Parity.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface ProviderChunk {
  type: 'content' | 'tool_use' | 'thinking' | 'done';
  id?: string;
  name?: string;
  content?: string;
  input?: any;
  tokensUsed?: number;
}

export interface ProviderResponse {
  content?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: any;
  }>;
  tokensUsed?: number;
  stopReason?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export abstract class BaseProvider {
  abstract name: string;
  
  /**
   * Refactored for Liquid Streaming (Phase 5).
   * Emits chunks in real-time.
   */
  abstract generate(
    messages: Array<{ role: string, content: string | any[] }>,
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ProviderChunk, ProviderResponse, unknown>;
}
