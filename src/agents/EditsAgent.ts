import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import { EditParser } from '../utils/EditParser';
import * as fs from 'fs';
import * as path from 'path';

export class EditsAgent extends BaseAgent {
    constructor(provider: any) {
        super('EditsAgent', provider);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'read_file',
                description: 'Reads a file to understand its context before editing.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path of the file' }
                    },
                    required: ['path']
                }
            },
            {
                name: 'apply_search_replace',
                description: 'Applies robust Aider-style SEARCH/REPLACE blocks to one or more files.',
                parameters: {
                    type: 'object',
                    properties: {
                        edits: {
                            type: 'string',
                            description: 'Text containing one or more SEARCH/REPLACE blocks. Include the full file path on a line before each block.'
                        }
                    },
                    required: ['edits']
                }
            },
            {
                name: 'write_file',
                description: 'Writes the full content to a file. Use this for complete rewrites or new files.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path of the file' },
                        content: { type: 'string', description: 'The NEW full content of the file' }
                    },
                    required: ['path', 'content']
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        try {
            switch (name) {
                case 'read_file':
                    const readPath = path.join(process.cwd(), args.path);
                    if (!fs.existsSync(readPath)) return { success: false, output: '', error: `File not found: ${args.path}` };
                    return { success: true, output: fs.readFileSync(readPath, 'utf-8') };

                case 'apply_search_replace':
                    const blocks = EditParser.parseBlocks(args.edits);
                    if (blocks.length === 0) return { success: false, output: '', error: 'No valid SEARCH/REPLACE blocks found in input.' };

                    const results = EditParser.applyBlocks(blocks);
                    const failed = results.filter(r => !r.success);

                    if (failed.length > 0) {
                        return {
                            success: false,
                            output: JSON.stringify(results),
                            error: `Failed to apply some edits: ${failed.map(f => `${f.filePath}: ${f.error}`).join(', ')}`
                        };
                    }
                    return { success: true, output: `Successfully applied ${blocks.length} edit blocks.` };

                case 'write_file':
                    const writePath = path.join(process.cwd(), args.path);
                    const dir = path.dirname(writePath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(writePath, args.content);
                    return { success: true, output: `Successfully wrote ${args.path}` };

                default:
                    return { success: false, output: '', error: `Unknown tool: ${name}` };
            }
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const systemPrompt = `You are Selfer's Edit Expert (API-Mode).
    Your ONLY purpose is to modify code using SEARCH/REPLACE blocks via tools.
    
    CRITICAL RULES:
    1. NEVER explain how to fix the code.
    2. NEVER output a list of steps or a plan. 
    3. You MUST call 'apply_search_replace' immediately.
    
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
