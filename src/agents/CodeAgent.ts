import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';

export class CodeAgent extends BaseAgent {
    constructor(provider: any) { super('CodeAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, `Executing: ${task}`);
        return `Simulated Code Action: ${task}`;
    }
}
