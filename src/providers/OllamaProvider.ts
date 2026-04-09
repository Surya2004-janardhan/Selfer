import axios from 'axios';
import { BaseProvider, ProviderResponse, ToolDefinition, ProviderChunk } from './BaseProvider.js';

export class OllamaProvider extends BaseProvider {
  name = 'ollama';
  private endpoint: string;
  private model: string;

  constructor(endpoint = 'http://localhost:11434/api/chat', model = 'llama3.2') {
    super();
    this.endpoint = endpoint;
    this.model = model;
  }

  async *generate(
    messages: Array<any>,
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ProviderChunk, ProviderResponse, unknown> {
    let totalPromptEval = 0;
    let totalEval = 0;
    let accumulatedContent = '';
    const toolCalls: any[] = [];

    try {
      const payload = {
        model: this.model,
        messages: messages.map(m => ({ 
          role: m.role, 
          content: m.content,
          tool_calls: (m as any).tool_calls
        })),
        tools: tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        })),
        stream: true
      };

      const response = await axios.post(this.endpoint, payload, { 
        responseType: 'stream',
        signal 
      });

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line);

          if (parsed.message?.content) {
            accumulatedContent += parsed.message.content;
            yield { type: 'content', content: parsed.message.content };
          }

          if (parsed.message?.tool_calls) {
            for (const tc of parsed.message.tool_calls) {
              const call = {
                id: tc.id || `call_${Math.random().toString(36).substring(7)}`,
                name: tc.function.name,
                input: tc.function.arguments
              };
              toolCalls.push(call);
              yield { type: 'tool_use', ...call };
            }
          }

          if (parsed.done) {
            totalPromptEval = parsed.prompt_eval_count || 0;
            totalEval = parsed.eval_count || 0;

            // Fallback for local models that output tool JSON raw into content
            if (toolCalls.length === 0 && accumulatedContent.includes('"name"')) {
              try {
                // Try to extract JSON from markdown wrappers if present
                const match = accumulatedContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || accumulatedContent.match(/(\{[\s\S]*\})/);
                if (match) {
                  const fakeTool = JSON.parse(match[1]);
                  if (fakeTool.name && (fakeTool.arguments || fakeTool.input)) {
                    const call = {
                      id: `call_${Math.random().toString(36).substring(7)}`,
                      name: fakeTool.name,
                      input: fakeTool.arguments || fakeTool.input
                    };
                    toolCalls.push(call);
                    // Do NOT yield tool_use here because done is true, it will be captured in finalResponse
                  }
                }
              } catch (e) {
                // Ignore parsing errors, it was just text
              }
            }
          }
        }
      }

      return {
        content: accumulatedContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        tokensUsed: totalPromptEval + totalEval,
        inputTokens: totalPromptEval,
        outputTokens: totalEval
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { content: accumulatedContent, stopReason: 'abort' };
      }
      throw new Error(`Ollama Streaming Error: ${error.message}`);
    }
  }
}
