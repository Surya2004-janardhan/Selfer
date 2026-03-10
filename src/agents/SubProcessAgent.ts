import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SubProcessAgent extends BaseAgent {
    constructor(provider: any) {
        super('SubProcessAgent', provider);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'execute',
                description: 'Runs a shell command and returns the output.',
                parameters: {
                    type: 'object',
                    properties: {
                        command: { type: 'string', description: 'Command to run' },
                        cwd: { type: 'string', description: 'Directory to run in' }
                    },
                    required: ['command']
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        if (name === 'execute') {
            try {
                const { stdout, stderr } = await execAsync(args.command, { cwd: args.cwd || process.cwd() });
                return { success: true, output: stdout + (stderr ? `\nSTDERR: ${stderr}` : '') };
            } catch (error: any) {
                return { success: false, output: error.stdout || '', error: error.message };
            }
        }
        return { success: false, output: '', error: `Tool ${name} not found` };
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "SubProcessAgent is primarily a tool provider. Use its 'execute' tool.";
    }
}
