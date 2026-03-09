import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import * as fs from 'fs';
import * as path from 'path';

export class EditsAgent extends BaseAgent {
    constructor(provider: any) { super('EditsAgent', provider); }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, task);

        const systemPrompt = `You are the Edits-Agent for Selfer. 
    Your job is to generate the code for the requested file edit.
    Task: ${task}
    
    IMPORTANT: You MUST output ONLY the raw content of the file. No markdown, no explanations.`;

        const content = await this.callLLM(systemPrompt, task);

        // In a real scenario, the task would specify the filename. 
        // For this implementation, we'll try to extract a filename or ask for one.
        const filenameMatch = task.match(/([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)/);
        if (filenameMatch) {
            const filePath = path.join(context.directory, filenameMatch[1]);
            fs.writeFileSync(filePath, content);
            return `File ${filenameMatch[1]} updated successfully.`;
        }

        return "Could not determine filename for editing.";
    }
}
