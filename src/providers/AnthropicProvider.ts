import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ProviderResponse, ToolDefinition, ProviderChunk } from './BaseProvider.js';

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-20241022') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async *generate(
    messages: Array<any>,
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ProviderChunk, ProviderResponse, unknown> {
    const formattedMessages = messages.map(msg => ({
      role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: msg.content,
      tool_use_id: (msg as any).tool_use_id
    }));

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      messages: formattedMessages as any,
      tools: tools as any
    }, { signal });

    let accumulatedContent = '';
    const toolCalls: any[] = [];
    let finalUsage: any = {};

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        accumulatedContent += event.delta.text;
        yield { type: 'content', content: event.delta.text };
      }

      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        const toolUse = event.content_block;
        const call = {
          id: toolUse.id,
          name: toolUse.name,
          input: {} // Will be populated by delta if needed, but SDK usually handles it in message_stop
        };
        toolCalls.push(call);
        yield { type: 'tool_use', ...call };
      }

      if (event.type === 'message_stop') {
         // Final cleanup if needed
      }
    }

    const finalMessage = await stream.finalMessage();
    finalUsage = finalMessage.usage;
    
    // Extract full tool inputs from the final message
    const toolUseBlocks = finalMessage.content.filter(b => b.type === 'tool_use') as any[];
    const completeToolCalls = toolUseBlocks.map(b => ({
        id: b.id,
        name: b.name,
        input: b.input
    }));

    return {
      content: accumulatedContent,
      toolCalls: completeToolCalls.length > 0 ? completeToolCalls : undefined,
      tokensUsed: finalUsage.input_tokens + finalUsage.output_tokens,
      inputTokens: finalUsage.input_tokens,
      outputTokens: finalUsage.output_tokens,
      stopReason: finalMessage.stop_reason ?? undefined
    };
  }
}
