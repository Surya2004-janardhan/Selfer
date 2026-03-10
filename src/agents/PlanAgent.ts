import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import { LLMMessage } from '../core/LLMProvider';

export class PlanAgent extends BaseAgent {
    constructor(provider: any) {
        super('PlanAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const lastTaskMessage = messages[messages.length - 1];

        const systemPrompt = `You are Selfer's Master Architect (API-Mode). 
    Your mission is to generate a multi-step execution plan in response to a user request.
    
    AVAILABLE AGENTS:
    - ContextAgent: Deep dives into directories (depth > 2).
    - EditsAgent: MANDATORY for modifying existing code (SEARCH/REPLACE).
    - FileAgent: Creating NEW files or running shell commands (npm, git, etc.).
    - GitAgent: Git operations (commit, push, etc.).
    - CLIAgent: Asking questions to the user.

    RULES:
    1. Output ONLY a valid JSON array. No preamble, no conversational text, no markdowns outside the JSON.
    2. EditsAgent REQUIRES an existing file path.
    3. If file changes are involved, ALWAYS plan a "write/edit" step BEFORE a "commit" step.
    
    OUTPUT FORMAT:
    [ { "agent": "AgentName", "task": "specific instruction" } ]`;

        const response = await this.provider.generateResponse([
            { role: 'system', content: systemPrompt },
            lastTaskMessage
        ]);
        const content = response.content;

        try {
            const start = content.indexOf('[');
            const end = content.lastIndexOf(']') + 1;
            if (start !== -1 && end !== -1 && end > start) {
                const jsonStr = content.substring(start, end);
                return JSON.parse(jsonStr);
            }
            throw new Error("No JSON array found in PlanAgent response.");
        } catch (error: any) {
            CLIGui.error(`PlanAgent failed to generate JSON: ${error.message}`);
            return [{ agent: "CLIAgent", task: content }];
        }
    }
}
