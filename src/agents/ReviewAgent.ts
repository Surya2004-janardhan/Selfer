import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class ReviewAgent extends BaseAgent {
    constructor(provider: any) {
        super('ReviewAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Review logic not yet fully implemented.";
    }
}
