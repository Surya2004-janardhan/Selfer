import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class TrackingAgent extends BaseAgent {
    constructor(provider: any) {
        super('TrackingAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Tracking functionality not yet fully implemented.";
    }
}
