import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class MemoryAgent extends BaseAgent {
    constructor(provider: any) {
        super('MemoryAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Long-term memory management not yet fully implemented.";
    }
}
