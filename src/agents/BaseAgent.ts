import { LLMProvider, LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';

export interface AgentContext {
    directory: string;
    sessionMemory: any;
    config: any;
}

export abstract class BaseAgent {
    constructor(
        protected name: string,
        protected provider: LLMProvider
    ) { }

    /**
     * Refactored: Now takes messages for conversational memory
     */
    abstract run(messages: LLMMessage[], context: AgentContext): Promise<any>;

    getTools(): Tool[] {
        return [];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        throw new Error(`Tool "${name}" not implemented in agent "${this.name}"`);
    }

    protected async callLLM(systemPrompt: string, userQuery: string): Promise<string> {
        const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
        ];
        const response = await this.provider.generateResponse(messages);
        return response.content;
    }

    getName(): string {
        return this.name;
    }
}
