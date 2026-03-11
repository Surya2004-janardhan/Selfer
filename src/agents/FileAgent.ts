import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import { LLMMessage } from '../core/LLMProvider';
import { Tool, ToolResult } from '../core/ToolRegistry';
import { ContextGuard } from '../utils/ContextGuard';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Maximum milliseconds a shell command is allowed to run. */
const COMMAND_TIMEOUT_MS = 60_000;

export class FileAgent extends BaseAgent {
    /** Absolute path of the project root. All file ops are restricted to this. */
    private readonly projectRoot: string;

    constructor(provider: any, projectRoot?: string) {
        super('FileAgent', provider);
        this.projectRoot = projectRoot || process.cwd();
    }

    getTools(): Tool[] {
        return [
            {
                name: 'list_files',
                description: 'Lists files in a directory recursively.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to list (defaults to project root)' }
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
                description: 'Executes a shell command in the project directory. Times out after 60 seconds.',
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
            switch (name) {
                case 'list_files': {
                    const targetPath = args.path
                        ? this.safeResolvePath(args.path)
                        : this.projectRoot;
                    if (!targetPath) return { success: false, output: '', error: 'Path is outside the project root.' };
                    const files = this.walkDir(targetPath, [], this.projectRoot);
                    const output = ContextGuard.truncate(files.join('\n'));
                    return { success: true, output };
                }

                case 'read_file': {
                    const fullPath = this.safeResolvePath(args.path);
                    if (!fullPath) return { success: false, output: '', error: 'Path is outside the project root.' };
                    if (!fs.existsSync(fullPath)) return { success: false, output: '', error: `File not found: ${args.path}` };
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    return { success: true, output: ContextGuard.truncate(content) };
                }

                case 'write_file': {
                    if (args.content === undefined) {
                        return { success: false, output: '', error: 'Missing required argument: content. You must provide the FULL file content.' };
                    }
                    const fullPath = this.safeResolvePath(args.path);
                    if (!fullPath) return { success: false, output: '', error: 'Path is outside the project root.' };
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(fullPath, args.content);
                    return { success: true, output: `Successfully wrote to ${args.path}` };
                }

                case 'delete_path': {
                    const fullPath = this.safeResolvePath(args.path);
                    if (!fullPath) return { success: false, output: '', error: 'Path is outside the project root.' };
                    if (!fs.existsSync(fullPath)) return { success: false, output: '', error: `Path not found: ${args.path}` };
                    
                    // Require user approval for deletion
                    const approved = await CLIGui.askPermission(
                        `Delete ${args.path}? This action cannot be undone.`
                    );
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to delete.' };
                    }
                    
                    const stats = fs.statSync(fullPath);
                    if (stats.isDirectory()) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(fullPath);
                    }
                    return { success: true, output: `Successfully deleted ${args.path}` };
                }

                case 'execute_command': {
                    // Require user approval for command execution
                    const approved = await CLIGui.askPermission(
                        `Execute command: ${args.command}`
                    );
                    if (!approved) {
                        return { success: false, output: '', error: 'User denied permission to execute command.' };
                    }
                    
                    const { stdout, stderr } = await execAsync(args.command, {
                        cwd: this.projectRoot,
                        timeout: COMMAND_TIMEOUT_MS
                    });
                    const raw = stdout + (stderr ? `\nStderr: ${stderr}` : '');
                    return { success: true, output: ContextGuard.truncate(raw) };
                }

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
    4. For 'write_file', you MUST extract the exact file path requested in the prompt. NEVER use placeholders like "path_to_file" or "file.txt".
    5. For 'write_file', you MUST provide the FULL, valid requested content of the file in the 'content' argument. NEVER use placeholders like "content_to_write".
    
    TOOLS: ${JSON.stringify(this.getTools())}
    
    OUTPUT FORMAT:
    {"tool": "tool_name", "args": {"path": "...", "content": "..."}}
    
    (Reasoning is allowed ONLY inside a <reasoning> tag before the JSON).`;

        const response = await this.provider.generateResponse([
            { role: 'system', content: systemPrompt },
            ...messages
        ]);
        return response.content;
    }

    /**
     * Resolves a relative path and ensures it is within the project root.
     * Returns the resolved absolute path, or null if the path is outside the root.
     */
    private safeResolvePath(relativePath: string): string | null {
        const resolved = path.resolve(this.projectRoot, relativePath);
        // Ensure the resolved path starts with projectRoot (no traversal)
        if (!resolved.startsWith(this.projectRoot + path.sep) && resolved !== this.projectRoot) {
            return null;
        }
        return resolved;
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
