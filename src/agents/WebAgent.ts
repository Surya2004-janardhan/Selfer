import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class WebAgent extends BaseAgent {
    constructor(provider: any) {
        super('WebAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Web search functionality not yet fully implemented.";
    }
}
