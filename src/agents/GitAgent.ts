import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import simpleGit from 'simple-git';

export class GitAgent extends BaseAgent {
    private git = simpleGit();

    constructor(provider: any) {
        super('GitAgent', provider);
    }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, task);

        try {
            const status = await this.git.status();

            // Handle 'commit' task
            if (task.toLowerCase().includes('commit')) {
                const diff = await this.git.diff(['--cached', '--stat']);
                if (status.files.length === 0 && !diff) {
                    return "Git: Workspace is clean. Nothing to commit.";
                }

                await this.git.add('.');

                // Use LLM to generate a tight 1-line commit message if the user didn't provide a specific one
                let commitMsg = task.replace(/commit/gi, '').trim();
                // If the message is generic or empty, generate from diff
                if (commitMsg.length < 5 || commitMsg.toLowerCase().includes('latest changes') || commitMsg.toLowerCase().includes('changes')) {
                    const detailedDiff = await this.git.diff(['--cached']);
                    const msgResponse = await this.callLLM(
                        "Generate a concise, professional 1-line conventional commit message (max 60 chars) based on this diff. Output ONLY the message.",
                        detailedDiff.substring(0, 2000)
                    );
                    commitMsg = msgResponse.trim().replace(/^"|"$/g, ''); // Clean quotes
                }

                await this.git.commit(commitMsg);
                return `Git: Successfully committed changes with message: "${commitMsg}"`;
            }

            // Handle 'push' task
            if (task.toLowerCase().includes('push')) {
                const branch = status.current || 'main';
                await this.git.push('origin', branch);
                return `Git: Successfully pushed changes to origin/${branch}`;
            }

            // Handle 'branch' task
            if (task.toLowerCase().includes('branch') || task.toLowerCase().includes('checkout')) {
                const branchName = task.match(/branch\s+([a-zA-Z0-9\-_/]+)/i)?.[1] ||
                    task.match(/checkout\s+([a-zA-Z0-9\-_/]+)/i)?.[1];
                if (branchName) {
                    await this.git.checkoutLocalBranch(branchName);
                    return `Git: Created and checked out new branch: ${branchName}`;
                }
            }

            // Generic status report
            return `Git Status: ${status.files.length} modified files on branch ${status.current}`;
        } catch (error: any) {
            CLIGui.error(`GitAgent: ${error.message}`);
            throw error;
        }
    }
}
