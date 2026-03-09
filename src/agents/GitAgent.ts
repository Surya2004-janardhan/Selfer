import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import simpleGit from 'simple-git';

export class GitAgent extends BaseAgent {
    private git = simpleGit();

    constructor(provider: any) { super('GitAgent', provider); }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, task);

        try {
            if (task.toLowerCase().includes('commit')) {
                const status = await this.git.status();
                if (status.files.length === 0) return "No changes to commit.";

                await this.git.add('.');
                await this.git.commit(task);
                return "Changes committed successfully.";
            }

            if (task.toLowerCase().includes('push')) {
                await this.git.push();
                return "Changes pushed successfully.";
            }

            return `Git task "${task}" recognized but logic not fully implemented.`;
        } catch (error: any) {
            throw new Error(`Git action failed: ${error.message}`);
        }
    }
}
