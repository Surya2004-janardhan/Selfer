import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import { RepoMap } from '../utils/RepoMap';

export class CodeAgent extends BaseAgent {
    constructor(provider: any) {
        super('CodeAgent', provider);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'get_repo_map',
                description: 'Returns a tree of files and directories in the repository, along with signatures for key files.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'get_file_signatures',
                description: 'Returns the function and class signatures for a specific file to understand its architecture without reading the whole file.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the file' }
                    },
                    required: ['path']
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        try {
            switch (name) {
                case 'get_repo_map':
                    return { success: true, output: RepoMap.getMap(3) };

                case 'get_file_signatures':
                    const sigs = RepoMap.getFileSignatures(args.path);
                    return { success: true, output: sigs || "No valid signatures or file not found." };

                default:
                    return { success: false, output: '', error: `Unknown tool: ${name}` };
            }
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const systemPrompt = `You are Selfer's Code Architecture Expert (API-Mode).
    Your goal is to inspect the codebase structure and signatures to answer the user's architectural questions.
    
    TOOLS: ${JSON.stringify(this.getTools())}
    
    RULES:
    1. If the user asks a question about code structure, you MUST use your tools to explore the codebase.
    2. Once you have enough context, provide a clear, concise answer describing the architecture or logic.
    3. If you decide to call a tool, output ONLY the JSON format.
    
    OUTPUT FORMAT (for calling tools):
    {"tool": "tool_name", "args": {...}}
    
    (Reasoning is allowed ONLY inside a <reasoning> tag before the JSON).`;

        const response = await this.provider.generateResponse([
            { role: 'system', content: systemPrompt },
            ...messages
        ]);
        return response.content;
    }
}
