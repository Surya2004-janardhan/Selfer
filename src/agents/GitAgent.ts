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
                if (status.files.length === 0) {
                    return "Git: Workspace is clean. Nothing to commit.";
                }

                // Identify files to add (default all if not specified)
                await this.git.add('.');

                // Extract or generate a conventional commit message
                let commitMsg = task.replace(/commit/gi, '').trim();
                if (commitMsg.length < 5) {
                    commitMsg = `chore: update files based on task "${task}"`;
                } else if (!/^(feat|fix|chore|docs|refactor|test|style|ci):/.test(commitMsg)) {
                    commitMsg = `chore: ${commitMsg}`;
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
