import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';
import { CLIGui } from '../utils/CLIGui';

export class ErrorRecoveryAgent extends BaseAgent {
    constructor(provider: any) {
        super('ErrorRecoveryAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const lastMessage = messages[messages.length - 1].content;
        CLIGui.logAgentAction(this.name, "Analyzing failure for recovery...");

        const systemPrompt = `You are the ErrorRecoveryAgent for Selfer. 
    Your goal is to analyze a failed tool execution and provide a clear, actionable recovery plan for the worker agent.

    INPUT FORMAT:
    - Failed Tool: [Name]
    - Error Message: [Details]
    - Original Intent: [What was being attempted]

    STRATEGY:
    1. If it's a SEARCH/REPLACE failure: Suggest identifying the exact lines again using 'read_file'. Indentation or hidden characters might be the issue.
    2. If it's a Git conflict: Suggest 'git status' and manual resolution or choosing a side.
    3. If it's a missing file: Suggest listing the directory to find the correct path.
    4. If it's a shell error: Analyze the exit code and stderr.

    OUTPUT:
    Provide a concise instruction for the next turn. Example: "Try reading the file again to get the exact indentation for the SEARCH block."`;

        const response = await this.provider.generateResponse([
            { role: 'system', content: systemPrompt },
            ...messages
        ]);
        return response.content;
    }
}
