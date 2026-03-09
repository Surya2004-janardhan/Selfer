import { BaseAgent, AgentContext } from './BaseAgent';
export class BrowserAgent extends BaseAgent {
    constructor(provider: any) { super('BrowserAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> { return "Browser search placeholder"; }
}
