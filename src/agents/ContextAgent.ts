import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import { CLIGui } from '../utils/CLIGui';
import { RepoMap } from '../utils/RepoMap';

export class ContextAgent extends BaseAgent {
    constructor(provider: any) {
        super('ContextAgent', provider);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'get_repo_map',
                description: 'Generates a high-level map of the repository, showing file tree and function/class signatures.',
                parameters: {
                    type: 'object',
                    properties: {
                        depth: { type: 'number', description: 'Max depth to traverse (default: 2). Use higher for deep investigative work.' }
                    },
                    required: []
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        if (name === 'get_repo_map') {
            try {
                const depth = args.depth || 2;
                const result = RepoMap.getMap(depth);
                return { success: true, output: result };
            } catch (e: any) {
                return { success: false, output: '', error: e.message };
            }
        }
        return { success: false, output: '', error: `Unknown tool: ${name}` };
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const lastTask = messages[messages.length - 1].content;
        CLIGui.logAgentAction(this.name, lastTask);

        const systemPrompt = `You are the ContextAgent. Your goal is to provide a "bird's eye view" of the repository.
    Use 'get_repo_map' to understand the project structure and important function signatures.
    Output ONLY JSON with tool calls or a final summary.`;

        const response = await this.provider.generateResponse([
            { role: 'system', content: systemPrompt },
            ...messages
        ]);
        return response.content;
    }
}
