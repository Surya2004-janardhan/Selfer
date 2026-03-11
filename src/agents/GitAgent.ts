import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import simpleGit from 'simple-git';

export class GitAgent extends BaseAgent {
    private git = simpleGit();

    constructor(provider: any) {
        super('GitAgent', provider);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'git_status',
                description: 'Shows the current status of the git repository.',
                parameters: { type: 'object', properties: {}, required: [] }
            },
            {
                name: 'git_diff',
                description: 'Shows the diff of staged changes.',
                parameters: { type: 'object', properties: {}, required: [] }
            },
            {
                name: 'git_commit',
                description: 'Stages all tracked (non-.gitignored) changes and commits with a message.',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The commit message' }
                    },
                    required: ['message']
                }
            },
            {
                name: 'git_push',
                description: 'Pushes committed changes to the remote origin.',
                parameters: { 
                    type: 'object', 
                    properties: {
                        force: { type: 'boolean', description: 'Force push (use with caution)' }
                    }, 
                    required: [] 
                }
            },
            {
                name: 'git_log',
                description: 'Shows recent commit history.',
                parameters: { 
                    type: 'object', 
                    properties: {
                        count: { type: 'number', description: 'Number of commits to show (default: 10)' }
                    }, 
                    required: [] 
                }
            },
            {
                name: 'git_revert',
                description: 'Reverts a specific commit. Creates a new commit that undoes the changes.',
                parameters: {
                    type: 'object',
                    properties: {
                        commit: { type: 'string', description: 'Commit hash to revert (default: HEAD)' },
                        noCommit: { type: 'boolean', description: 'Stage changes but do not commit' },
                        mainline: { type: 'number', description: 'Parent number for merge commits (1 or 2)' }
                    },
                    required: []
                }
            },
            {
                name: 'git_reset',
                description: 'Resets HEAD to a specific commit.',
                parameters: {
                    type: 'object',
                    properties: {
                        commit: { type: 'string', description: 'Commit hash to reset to (default: HEAD~1)' },
                        mode: { type: 'string', description: 'Reset mode: soft, mixed, or hard (default: mixed)' }
                    },
                    required: []
                }
            },
            {
                name: 'execute_git',
                description: 'Execute an arbitrary git command. Use for advanced operations not covered by other tools.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Git arguments (e.g., "branch -D feature")' }
                    },
                    required: ['args']
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        try {
            switch (name) {
                case 'git_status': {
                    const status = await this.git.status();
                    return { success: true, output: JSON.stringify(status, null, 2) };
                }
                case 'git_diff': {
                    const diff = await this.git.diff(['--cached']);
                    return { success: true, output: diff || 'No staged changes to diff.' };
                }
                case 'git_commit': {
                    // Require approval for commits
                    const approved = await CLIGui.askPermission(
                        `Commit all changes with message: "${args.message}"`
                    );
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to commit.' };
                    }
                    
                    // Use '--all' to stage modifications and deletions of TRACKED files only.
                    // This respects .gitignore and does NOT blindly add untracked files.
                    await this.git.add('--all');
                    await this.git.commit(args.message);
                    return { success: true, output: `Committed with message: "${args.message}"` };
                }
                case 'git_push': {
                    // Require approval for push
                    const forceFlag = args.force ? ' --force' : '';
                    const approved = await CLIGui.askPermission(
                        `Push committed changes to remote origin${forceFlag}?`
                    );
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to push.' };
                    }
                    
                    if (args.force) {
                        await this.git.push(['--force']);
                    } else {
                        await this.git.push();
                    }
                    return { success: true, output: 'Successfully pushed to origin.' };
                }
                case 'git_log': {
                    const count = args.count || 10;
                    const log = await this.git.log({ maxCount: count });
                    const formatted = log.all.map(c => 
                        `${c.hash.slice(0,7)} - ${c.message} (${c.author_name}, ${c.date})`
                    ).join('\n');
                    return { success: true, output: formatted || 'No commits found.' };
                }
                case 'git_revert': {
                    const commit = args.commit || 'HEAD';
                    const desc = args.mainline 
                        ? `Revert merge commit ${commit} (mainline ${args.mainline})`
                        : `Revert commit ${commit}`;
                    
                    const approved = await CLIGui.askPermission(desc);
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to revert.' };
                    }
                    
                    const revertArgs: string[] = ['revert'];
                    if (args.noCommit) revertArgs.push('--no-commit');
                    if (args.mainline) revertArgs.push('-m', String(args.mainline));
                    revertArgs.push(commit);
                    
                    const result = await this.git.raw(revertArgs);
                    return { success: true, output: result || `Successfully reverted ${commit}` };
                }
                case 'git_reset': {
                    const commit = args.commit || 'HEAD~1';
                    const mode = args.mode || 'mixed';
                    
                    const approved = await CLIGui.askPermission(
                        `Reset HEAD to ${commit} (${mode} mode)?`
                    );
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to reset.' };
                    }
                    
                    await this.git.reset([`--${mode}`, commit]);
                    return { success: true, output: `Reset to ${commit} (${mode})` };
                }
                case 'execute_git': {
                    const approved = await CLIGui.askPermission(
                        `Execute: git ${args.args}`
                    );
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to execute git command.' };
                    }
                    
                    const result = await this.git.raw(args.args.split(' '));
                    return { success: true, output: result || 'Command completed.' };
                }
                default:
                    return { success: false, output: '', error: `Unknown tool: ${name}` };
            }
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const lastTask = messages[messages.length - 1].content;
        CLIGui.logAgentAction(this.name, lastTask);

        const systemPrompt = `You are Selfer's Git Expert (API-Mode).
    Your ONLY purpose is to execute git commands via tools.
    
    CRITICAL RULES:
    1. NEVER output a list of steps or "how-to" instructions.
    2. NEVER output a markdown list (1, 2, 3) for the user to follow.
    3. You MUST call 'git_commit' if a commit is requested.
    4. You MUST call 'git_push' if a push is requested.
    
    TOOLS: ${JSON.stringify(this.getTools())}
    
    OUTPUT FORMAT:
    {"tool": "tool_name", "args": {...}}
    
    (Reasoning is allowed ONLY inside a <reasoning> tag before the JSON).`;

        const response = await this.provider.generateResponse([
            { role: 'system', content: systemPrompt },
            ...messages
        ]);
        return response.content;
    }
}
