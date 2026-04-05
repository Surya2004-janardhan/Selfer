import { BaseProvider, ProviderResponse, ToolDefinition, ProviderChunk } from './BaseProvider.js';

/**
 * MockProvider.ts
 * A deterministic provider for internal testing and verification of Selfer's loops.
 * Updated for Phase 5 Streaming.
 */
export class MockProvider extends BaseProvider {
  name = 'mock';
  private triggerTool = false;

  constructor(triggerTool = true) {
    super();
    this.triggerTool = triggerTool;
  }

  async *generate(
    messages: Array<any>,
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ProviderChunk, ProviderResponse, unknown> {
    const lastMsg = messages[messages.length - 1];

    if (signal?.aborted) {
        return { content: '', stopReason: 'abort' };
    }

    // Simulate streaming for better UX feel during testing
    const streamContent = async function* (text: string) {
        const words = text.split(' ');
        for (const word of words) {
            if (signal?.aborted) break;
            yield { type: 'content', content: word + ' ' } as ProviderChunk;
            await new Promise(r => setTimeout(r, 50)); 
        }
    };

    // If it's a tool result, return final answer
    if (lastMsg.role === 'tool') {
      const text = 'I have successfully verified the pulse and created the file. SELFER is alive.';
      yield* streamContent(text);
      return {
        content: text,
        stopReason: 'end_turn'
      };
    }

    if (this.triggerTool && tools && tools.length > 0) {
      const calls = [
          {
            id: 'call_1',
            name: 'PulseSkill',
            input: {}
          },
          {
            id: 'call_2',
            name: 'FileWrite',
            input: { absolute_path: 'TEST_SUCCESS.md', content: 'Selfer is Alive' }
          }
      ];
      
      for (const call of calls) {
          yield { type: 'tool_use', ...call };
      }

      return {
        toolCalls: calls,
        stopReason: 'tool_use'
      };
    }

    const defaultText = 'Hello! I am Selfer, your AI agent.';
    yield* streamContent(defaultText);
    return {
      content: defaultText,
      stopReason: 'end_turn'
    };
  }
}
