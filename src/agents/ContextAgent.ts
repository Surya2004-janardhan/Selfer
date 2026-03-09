import { BaseAgent, AgentContext } from './BaseAgent';
export class ContextAgent extends BaseAgent {
    constructor(provider: any) { super('ContextAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> { return "Context provider placeholder"; }
}
