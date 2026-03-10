import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FileAgent extends BaseAgent {
    constructor(provider: any) {
        super('FileAgent', provider);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'list_files',
                description: 'Lists files in a directory recursively.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to list' }
                    },
                    required: []
                }
            },
            {
                name: 'read_file',
                description: 'Reads the content of a file.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path of the file to read' }
                    },
                    required: ['path']
                }
            },
            {
                name: 'write_file',
                description: 'Writes content to a file (creates or overwrites).',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path of the file' },
                        content: { type: 'string', description: 'Content to write' }
                    },
                    required: ['path', 'content']
                }
            },
            {
                name: 'execute_command',
                description: 'Executes a system command in the project directory.',
                parameters: {
                    type: 'object',
                    properties: {
                        command: { type: 'string', description: 'The CLI command to run' }
                    },
                    required: ['command']
                }
            },
            {
                name: 'delete_path',
                description: 'Deletes a file or directory.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to delete' }
                    },
                    required: ['path']
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        try {
            const targetPath = args.path ? path.normalize(args.path).replace(/^(\.\.[\/\\])+/, '') : '';
            const fullPath = path.join(process.cwd(), targetPath);

            switch (name) {
                case 'list_files':
                    const files = this.walkDir(fullPath, [], process.cwd());
                    return { success: true, output: files.join('\n') };

                case 'read_file':
                    if (!fs.existsSync(fullPath)) return { success: false, output: '', error: `File not found: ${args.path}` };
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    return { success: true, output: content };

                case 'write_file':
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(fullPath, args.content);
                    return { success: true, output: `Successfully wrote to ${args.path}` };

                case 'delete_path':
                    if (!fs.existsSync(fullPath)) return { success: false, output: '', error: `Path not found: ${args.path}` };
                    const stats = fs.statSync(fullPath);
                    if (stats.isDirectory()) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(fullPath);
                    }
                    return { success: true, output: `Successfully deleted ${args.path}` };

                case 'execute_command':
                    const { stdout, stderr } = await execAsync(args.command, { cwd: process.cwd() });
                    return { success: true, output: stdout + (stderr ? `\nErrors: ${stderr}` : '') };

                default:
                    return { success: false, output: '', error: `Unknown tool: ${name}` };
            }
        } catch (error: any) {
            return { success: false, output: '', error: error.message };
        }
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const systemPrompt = `You are Selfer's File Expert (API-Mode).
    Your ONLY purpose is to perform file operations via tools.
    
    CRITICAL RULES:
    1. NEVER provide "how-to" advice or instructions.
    2. NEVER output a list of steps.
    3. You must execute 'write_file' if the user asks to create or update a file.
    
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

    private walkDir(dir: string, fileList: string[] = [], baseDir: string = ''): string[] {
        if (!fs.existsSync(dir)) return [];
        const files = fs.readdirSync(dir);
        fileList = fileList || [];
        baseDir = baseDir || dir;

        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const relativePath = path.relative(baseDir, filePath);
            if (file.startsWith('.') || file === 'node_modules' || file === 'dist') return;
            if (fs.statSync(filePath).isDirectory()) {
                fileList = this.walkDir(filePath, fileList, baseDir);
            } else {
                fileList.push(relativePath);
            }
        });
        return fileList;
    }
}
