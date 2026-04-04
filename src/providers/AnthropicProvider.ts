import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ProviderResponse, ToolDefinition } from './BaseProvider.js';

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-20241022') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generate(
    messages: Array<any>,
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: formattedMessages,
      tools: tools as any
    });

    const contentBlock = response.content.find(block => block.type === 'text');
    const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

    return {
      content: contentBlock?.type === 'text' ? contentBlock.text : undefined,
      toolCalls: toolUseBlocks.map((block: any) => ({
        id: block.id,
        name: block.name,
        input: block.input
      })),
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      stopReason: response.stop_reason
    };
  }
}
