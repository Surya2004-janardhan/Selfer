import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import * as fs from 'fs';
import * as path from 'path';

export class FileAgent extends BaseAgent {
    constructor(provider: any) { super('FileAgent', provider); }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, task);

        // Real implementation of file reading/listing
        if (task.toLowerCase().includes('list')) {
            const files = fs.readdirSync(context.directory);
            return `Files in ${context.directory}: ${files.join(', ')}`;
        }

        if (task.toLowerCase().includes('read')) {
            const filenameMatch = task.match(/([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)/);
            if (filenameMatch) {
                const filePath = path.join(context.directory, filenameMatch[1]);
                const content = fs.readFileSync(filePath, 'utf-8');
                return `Content of ${filenameMatch[1]}: \n${content.substring(0, 100)}...`;
            }
        }

        return `File task "${task}" executed.`;
    }
}
