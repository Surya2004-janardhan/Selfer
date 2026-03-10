import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class ErrorTrackerAgent extends BaseAgent {
    constructor(provider: any) {
        super('ErrorTrackerAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Error tracking not yet fully implemented.";
    }
}
