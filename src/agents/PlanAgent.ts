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
    - ContextAgent: Deep dives into directories (depth > 2) and file metadata.
    - CodeAgent: Explores repository architecture, file signatures, and code logic.
    - EditsAgent: MANDATORY for modifying SPECIFIC LINES of existing code (SEARCH/REPLACE).
    - FileAgent: Creating NEW files, completely REWRITING existing files, or running shell commands (npm, git, etc.).
    - GitAgent: Git operations (commit, push, etc.).
    - CLIAgent: Asking questions to the user or requesting manual testing.

    RULES:
    1. Output ONLY a valid JSON array. No preamble, no conversational text.
    2. You do not need to plan the entire task up front if it is complex. You can issue a short exploratory plan (e.g., [CodeAgent, ContextAgent]) to gather information first.
    3. EditsAgent REQUIRES an existing file path and is ONLY for partial changes. For full file rewrites (like a complete README replacement), use FileAgent.
    4. If file changes are involved, ALWAYS plan an "EditsAgent" or "FileAgent" step BEFORE a "GitAgent" step.
    
    OUTPUT FORMAT:
    [ { "agent": "AgentName", "task": "specific instruction" } ]`;

        const response = await this.provider.generateResponse([
            { role: 'system', content: systemPrompt },
            lastTaskMessage
        ]);
        const content = response.content;

        try {
            // First try strict parsing
            const start = content.indexOf('[');
            const end = content.lastIndexOf(']') + 1;
            if (start !== -1 && end !== -1 && end > start) {
                const jsonStr = content.substring(start, end);

                // Fallback cleanup if LLM included unescaped quotes or bad formatting
                const cleanedJsonStr = jsonStr.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m); // strip comments

                return JSON.parse(cleanedJsonStr);
            }
            throw new Error("No JSON array found in PlanAgent response.");
        } catch (error: any) {
            CLIGui.error(`PlanAgent failed to generate JSON: ${error.message}. Raw output: ${content}`);
            // Fallback: Return a single step using CLIAgent to report the parsing error, to prevent crash.
            return [{ agent: "CLIAgent", task: "I failed to generate a proper execution plan due to a JSON formatting error. Please rephrase your request." }];
        }
    }
}
