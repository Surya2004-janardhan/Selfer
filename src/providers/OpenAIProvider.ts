import OpenAI from 'openai';
import { BaseProvider, ProviderResponse, ToolDefinition } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(
    messages: Array<any>,
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role === 'tool' ? 'function' : msg.role,
        content: msg.content,
        name: msg.role === 'tool' ? msg.name : undefined
      })) as any,
      tools: tools?.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema
        }
      })) as any
    });

    const msg = response.choices[0].message;

    return {
      content: msg.content || undefined,
      toolCalls: msg.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments)
      })),
      tokensUsed: response.usage?.total_tokens || 0,
      stopReason: response.choices[0].finish_reason
    };
  }
}
