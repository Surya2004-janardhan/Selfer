import { BaseAgent, AgentContext } from './BaseAgent';
export class WebAgent extends BaseAgent {
    constructor(provider: any) { super('WebAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> { return "Web search placeholder"; }
}
