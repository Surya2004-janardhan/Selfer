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
    try {
      const data = {
        model: this.model,
        messages: messages.map(m => ({ 
          role: m.role, 
          content: m.content 
        })),
        tools: tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        })),
        stream: false
      };

      const response = await axios.post(this.endpoint, data, { timeout: 30000 });
      const msg = response.data.message;

      return {
        content: msg.content,
        toolCalls: msg.tool_calls?.map((tc: any) => ({
          id: tc.id || `call_${Math.random().toString(36).substring(7)}`,
          name: tc.function.name,
          input: tc.function.arguments
        })),
        tokensUsed: response.data.eval_count || 0,
        stopReason: response.data.done_reason
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
        throw new Error(`Ollama Error: Model "${this.model}" not found or Ollama is not running at ${this.endpoint}.`);
      }
      throw new Error(`Ollama Error: ${error.message}`);
    }
  }
}
