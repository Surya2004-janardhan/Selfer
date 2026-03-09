import { BaseAgent, AgentContext } from './BaseAgent';
export class TelegramAgent extends BaseAgent {
    constructor(provider: any) { super('TelegramAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> { return "Telegram message placeholder"; }
}
