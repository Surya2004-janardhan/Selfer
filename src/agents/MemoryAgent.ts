import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';

export class MemoryAgent extends BaseAgent {
    constructor(provider: any) { super('MemoryAgent', provider); }
    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, `Executing: ${task}`);
        return `Simulated Memory Action: ${task}`;
    }
}
