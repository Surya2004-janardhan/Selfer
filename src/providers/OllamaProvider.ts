import axios from 'axios';
import { BaseProvider, ProviderResponse, ToolDefinition } from './BaseProvider.js';

export class OllamaProvider extends BaseProvider {
  name = 'ollama';
  private endpoint: string;
  private model: string;

  constructor(endpoint = 'http://localhost:11434/api/chat', model = 'llama3.2') {
    super();
    this.endpoint = endpoint;
    this.model = model;
  }

  async generate(
    messages: Array<any>,
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const data = {
      model: this.model,
      messages,
      tools,
      stream: false
    };

    try {
      const response = await axios.post(this.endpoint, data);
      const msg = response.data.message;

      return {
        content: msg.content,
        toolCalls: msg.tool_calls?.map((tc: any) => ({
          id: tc.id || `call_${crypto.randomUUID()}`,
          name: tc.function.name,
          input: tc.function.arguments
        })),
        tokensUsed: response.data.eval_count || 0,
        stopReason: response.data.done_reason
      };
    } catch (error: any) {
      console.error('Ollama Error:', error.message);
      throw new Error('Local Ollama server connection lost.');
    }
  }
}
