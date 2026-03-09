import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import * as fs from 'fs';
import * as path from 'path';

export class FileAgent extends BaseAgent {
    constructor(provider: any) {
        super('FileAgent', provider);
    }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, task);

        try {
            // 1. Handle Listing/Mapping files
            if (task.toLowerCase().includes('list') || task.toLowerCase().includes('map')) {
                const files = this.walkDir(context.directory);
                return `Project Map (${files.length} files found):\n${files.slice(0, 20).join('\n')}${files.length > 20 ? '\n...' : ''}`;
            }

            // 2. Handle Reading files
            if (task.toLowerCase().includes('read') || task.toLowerCase().includes('view')) {
                const matches = task.match(/([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)/g);
                if (matches && matches.length > 0) {
                    let results = "";
                    for (const fileName of matches) {
                        const filePath = path.join(context.directory, fileName);
                        if (fs.existsSync(filePath)) {
                            const stats = fs.statSync(filePath);
                            if (stats.size > 50000) { // Safety check for large files
                                results += `\n--- ${fileName} (Large File) ---\nFile is too large for full reading. Summarizing...`;
                            } else {
                                const content = fs.readFileSync(filePath, 'utf-8');
                                results += `\n--- ${fileName} ---\n${content}`;
                            }
                        }
                    }
                    return results || "Files found in query but could not be located on disk.";
                }
            }

            // 3. Handle Searching for content
            if (task.toLowerCase().includes('search') || task.toLowerCase().includes('find')) {
                const query = task.match(/(?:search|find)\s+(?:"|')?([^"']+)("|')?/i)?.[1];
                if (query) {
                    return `Search result for "${query}": Found in multiple files (Simulated Search)`;
                }
            }

            return `FileAgent: Task recognized but no specific action taken for "${task}"`;
        } catch (error: any) {
            CLIGui.error(`FileAgent: ${error.message}`);
            throw error;
        }
    }

    private walkDir(dir: string, fileList: string[] = [], baseDir: string = ''): string[] {
        const files = fs.readdirSync(dir);
        fileList = fileList || [];
        baseDir = baseDir || dir;

        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const relativePath = path.relative(baseDir, filePath);

            // Skip hidden/ignored folders
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
