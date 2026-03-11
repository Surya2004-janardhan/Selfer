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
                parameters: { type: 'object', properties: {}, required: [] }
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
                    const approved = await CLIGui.askPermission(
                        `Push committed changes to remote origin?`
                    );
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to push.' };
                    }
                    
                    await this.git.push();
                    return { success: true, output: 'Successfully pushed to origin.' };
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
