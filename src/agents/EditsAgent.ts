import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import * as fs from 'fs';
import * as path from 'path';

export class EditsAgent extends BaseAgent {
    constructor(provider: any) {
        super('EditsAgent', provider);
    }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, task);

        // Extract filename from task
        const filenameMatch = task.match(/([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)/);
        const fileName = filenameMatch ? filenameMatch[1] : null;

        if (!fileName) {
            return "EditsAgent: Could not identify target filename in the task.";
        }

        const filePath = path.join(context.directory, fileName);
        let existingContent = "";
        if (fs.existsSync(filePath)) {
            existingContent = fs.readFileSync(filePath, 'utf-8');
        }

        const systemPrompt = `You are the Production-Ready Edits-Agent for Selfer.
    Your job is to generate the COMPLETE content for the file: ${fileName}.
    
    Current File Context (if exists):
    ${existingContent}
    
    Task: ${task}
    
    Guidelines:
    1. If the file exists, respect the existing code style and patterns.
    2. Ensure the code is production-quality, documented, and type-safe.
    3. Output ONLY the raw file content. No markdown code blocks, no preamble.`;

        const newContent = await this.callLLM(systemPrompt, task);

        try {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, newContent.trim());
            const action = existingContent ? "Updated" : "Created";
            return `${action} file "${fileName}" with ${newContent.split('\n').length} lines of code.`;
        } catch (error: any) {
            CLIGui.error(`EditsAgent: ${error.message}`);
            throw error;
        }
    }
}
