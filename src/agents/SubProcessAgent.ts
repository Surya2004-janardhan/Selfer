import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import { ContextGuard } from '../utils/ContextGuard';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Maximum milliseconds a shell command is allowed to run. */
const COMMAND_TIMEOUT_MS = 60_000;

export class SubProcessAgent extends BaseAgent {
    constructor(provider: any) {
        super('SubProcessAgent', provider);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'execute',
                description: 'Runs a shell command and returns the output. Times out after 60 seconds.',
                parameters: {
                    type: 'object',
                    properties: {
                        command: { type: 'string', description: 'Command to run' },
                        cwd: { type: 'string', description: 'Directory to run in (defaults to project root)' }
                    },
                    required: ['command']
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        if (name === 'execute') {
            try {
                const { stdout, stderr } = await execAsync(args.command, {
                    cwd: args.cwd || process.cwd(),
                    timeout: COMMAND_TIMEOUT_MS
                });
                const raw = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
                return { success: true, output: ContextGuard.truncate(raw) };
            } catch (error: any) {
                return { success: false, output: ContextGuard.truncate(error.stdout || ''), error: error.message };
            }
        }
        return { success: false, output: '', error: `Tool ${name} not found` };
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "SubProcessAgent is primarily a tool provider. Use its 'execute' tool.";
    }
}
