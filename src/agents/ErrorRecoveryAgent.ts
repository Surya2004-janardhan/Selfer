import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class ErrorRecoveryAgent extends BaseAgent {
    constructor(provider: any) {
        super('ErrorRecoveryAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Error recovery logic not yet fully implemented.";
    }
}
