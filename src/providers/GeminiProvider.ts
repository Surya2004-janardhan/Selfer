import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider, ProviderResponse, ToolDefinition, ProviderChunk } from './BaseProvider.js';

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash') {
    super();
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async *generate(
    messages: Array<any>,
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ProviderChunk, ProviderResponse, unknown> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.model,
      tools: tools ? [{ 
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.input_schema as any
        })) as any
      }] : undefined
    });

    const contents = messages.map(m => {
      let role = m.role;
      if (role === 'assistant') role = 'model';
      
      // Handle tool results which in Gemini are part of the 'functionResponse'
      const parts = [];
      if (m.content) {
        parts.push({ text: m.content });
      }
      
      if ((m as any).tool_calls) {
        for (const tc of (m as any).tool_calls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: typeof tc.input === 'string' ? JSON.parse(tc.input) : tc.input
            }
          });
        }
      }

      if (m.role === 'tool') {
        parts.push({
          functionResponse: {
            name: m.name,
            response: typeof m.content === 'string' ? { result: m.content } : m.content
          }
        });
        role = 'function';
      }

      return { role, parts };
    });

    try {
      const result = await model.generateContentStream({
        contents: contents as any
      });

      let accumulatedContent = '';
      const toolCalls: any[] = [];

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          accumulatedContent += text;
          yield { type: 'content', content: text };
        }

        const calls = chunk.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
        if (calls && calls.length > 0) {
          for (const call of calls) {
            const tc = {
              id: `call_${Math.random().toString(36).substring(7)}`,
              name: call.functionCall!.name,
              input: call.functionCall!.args
            };
            toolCalls.push(tc);
            yield { type: 'tool_use', ...tc };
          }
        }
      }

      const response = await result.response;
      const usage = response.usageMetadata;

      return {
        content: accumulatedContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        tokensUsed: usage?.totalTokenCount || 0,
        inputTokens: usage?.promptTokenCount || 0,
        outputTokens: usage?.candidatesTokenCount || 0
      };

    } catch (error: any) {
      throw new Error(`Gemini Error: ${error.message}`);
    }
  }
}
