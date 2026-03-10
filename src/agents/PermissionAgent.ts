import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';

export class PermissionAgent extends BaseAgent {
    constructor(provider: any) {
        super('PermissionAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "Permission management not yet fully implemented.";
    }
}
