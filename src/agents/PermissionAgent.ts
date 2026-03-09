import { BaseAgent, AgentContext } from './BaseAgent';
export class PermissionAgent extends BaseAgent {
    constructor(provider: any) { super('PermissionAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> { return "Permission request placeholder"; }
}
