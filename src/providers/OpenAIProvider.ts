import OpenAI from 'openai';
import { BaseProvider, ProviderResponse, ToolDefinition, ProviderChunk } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async *generate(
    messages: Array<any>,
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ProviderChunk, ProviderResponse, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role === 'tool' ? 'tool' : (msg.role === 'assistant' ? 'assistant' : 'user'),
        content: msg.content,
        tool_call_id: msg.tool_use_id,
        name: (msg as any).name
      })) as any,
      tools: tools?.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema
        }
      })) as any,
      stream: true
    }, { signal });

    let accumulatedContent = '';
    const toolCalls: any[] = [];
    let usage: any = { prompt_tokens: 0, completion_tokens: 0 };

    for await (const chunk of stream) {
      const delta = chunk.choices[0].delta;

      if (delta.content) {
        accumulatedContent += delta.content;
        yield { type: 'content', content: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          // OpenAI tool calls stream delta pieces, need to accumulate
          if (!toolCalls[tc.index]) {
            toolCalls[tc.index] = { 
                id: tc.id, 
                name: tc.function?.name, 
                input: '' 
            };
            yield { type: 'tool_use', id: tc.id, name: tc.function?.name };
          }
          if (tc.function?.arguments) {
            toolCalls[tc.index].input += tc.function.arguments;
          }
        }
      }
    }

    // Final cleanup of tool call inputs (JSON parse)
    const finalizedToolCalls = toolCalls.filter(Boolean).map(tc => ({
        ...tc,
        input: JSON.parse(tc.input || '{}')
    }));

    return {
      content: accumulatedContent,
      toolCalls: finalizedToolCalls.length > 0 ? finalizedToolCalls : undefined,
      tokensUsed: 0, // OpenAI streaming usage requires specific headers/options often, keeping 0 for stability
      inputTokens: 0,
      outputTokens: 0
    };
  }
}
