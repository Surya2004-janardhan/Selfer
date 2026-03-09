import { BaseAgent, AgentContext } from './BaseAgent';
export class ReviewAgent extends BaseAgent {
    constructor(provider: any) { super('ReviewAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> { return "Code review placeholder"; }
}
