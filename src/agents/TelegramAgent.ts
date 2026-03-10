import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class TelegramAgent extends BaseAgent {
    constructor(provider: any) {
        super('TelegramAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Telegram integration not yet fully implemented.";
    }
}
