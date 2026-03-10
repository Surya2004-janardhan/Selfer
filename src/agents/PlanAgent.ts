import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';
import { LLMMessage } from '../core/LLMProvider';

export class PlanAgent extends BaseAgent {
    constructor(provider: any) {
        super('PlanAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const lastTaskMessage = messages[messages.length - 1];
        CLIGui.logAgentAction(this.name, lastTaskMessage.content);

        const systemPrompt = `Act as the Master Architect for Selfer. 
    Review the repository structure and user request. Create a multi-step execution plan.

    AVAILABLE AGENTS:
    - ContextAgent: Use for deep dives into specific directories if depth > 2 is needed.
    - EditsAgent: MANDATORY for modifying existing code using SEARCH/REPLACE blocks.
    - FileAgent: Use for creating NEW files or running shell commands (npm, git, etc.).
    - GitAgent: Use for status, diff, commit, and push. ALWAYS use Conventional Commits.
    - CLIAgent: Use ONLY if you need to ask a question to the user.

    PLANNING RULES:
    1. NEVER repeat the input guidelines or repo map in your response.
    2. Start with 'npm install' or 'npm run build' if needed.
    3. EditsAgent ALWAYS needs a file path.
    4. Provide EXACT tasks for each agent.
    
    OUTPUT FORMAT:
    Output ONLY a JSON array: [ { "agent": "AgentName", "task": "detailed instruction" } ]`;

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
