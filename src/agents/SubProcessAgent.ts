import { BaseAgent, AgentContext } from './BaseAgent';
export class SubProcessAgent extends BaseAgent {
    constructor(provider: any) { super('SubProcessAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> { return "Subprocess execution placeholder"; }
}
