import { LLMProvider, LLMMessage } from '../core/LLMProvider';

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

    abstract run(task: string, context: AgentContext): Promise<any>;

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
