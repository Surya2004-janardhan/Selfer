import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class BrowserAgent extends BaseAgent {
    constructor(provider: any) {
        super('BrowserAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Browser functionality not yet fully implemented.";
    }
}
