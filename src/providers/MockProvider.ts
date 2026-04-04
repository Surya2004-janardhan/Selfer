import { BaseProvider, ProviderResponse, ToolDefinition } from './BaseProvider.js';

/**
 * MockProvider.ts
 * A deterministic provider for internal testing and verification of Selfer's loops.
 */
export class MockProvider extends BaseProvider {
  name = 'mock';
  private triggerTool = false;

  constructor(triggerTool = true) {
    super();
    this.triggerTool = triggerTool;
  }

  async generate(
    messages: Array<any>,
    tools?: ToolDefinition[]
  ): Promise<ProviderResponse> {
    const lastMsg = messages[messages.length - 1];

    // If it's a tool result, return final answer
    if (lastMsg.role === 'tool') {
      return {
        content: 'I have successfully verified the pulse and created the file. SELFER is alive.',
        stopReason: 'end_turn'
      };
    }

    if (this.triggerTool && tools && tools.length > 0) {
      return {
        toolCalls: [
          {
            id: 'call_1',
            name: 'PulseSkill',
            input: {}
          },
          {
            id: 'call_2',
            name: 'DiskSkill',
            input: { action: 'write', filePath: 'TEST_SUCCESS.md', content: 'Selfer is Alive' }
          }
        ],
        stopReason: 'tool_use'
      };
    }

    return {
      content: 'Hello! I am Selfer, your AI agent.',
      stopReason: 'end_turn'
    };
  }
}
