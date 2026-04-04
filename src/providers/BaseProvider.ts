/**
 * BaseProvider.ts
 * Abstract interface for multi-model implementation.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, any>;
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
}

export abstract class BaseProvider {
  abstract name: string;
  abstract generate(
    messages: Array<{ role: string, content: string | any[] }>,
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse>;
}
