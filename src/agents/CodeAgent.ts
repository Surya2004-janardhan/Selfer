import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class CodeAgent extends BaseAgent {
    constructor(provider: any) {
        super('CodeAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Code analysis functionality not yet fully implemented.";
    }
}
