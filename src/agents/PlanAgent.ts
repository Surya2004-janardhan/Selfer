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
            // Robust JSON Extraction
            let jsonStr = content.trim();

            // 1. Remove markdown code blocks if present
            if (jsonStr.includes('```json')) {
                const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
                if (match) jsonStr = match[1];
            } else if (jsonStr.includes('```')) {
                const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
                if (match) jsonStr = match[1];
            }

            // 2. Find the bounds of the array
            const start = jsonStr.indexOf('[');
            const end = jsonStr.lastIndexOf(']') + 1;

            if (start !== -1 && end !== -1 && end > start) {
                jsonStr = jsonStr.substring(start, end);

                // 3. Strip single-line and multi-line comments safely
                // This regex avoids breaking strings.
                const cleanedJsonStr = jsonStr.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);

                return JSON.parse(cleanedJsonStr);
            }
            throw new Error("No JSON array found in PlanAgent response.");
        } catch (error: any) {
            const fs = require('fs');
            fs.writeFileSync('raw_plan_fail.txt', content, 'utf-8');
            CLIGui.error(`PlanAgent failed to generate JSON: ${error.message}. Raw output saved to raw_plan_fail.txt`);
            // Fallback: Return a single step using CLIAgent to report the parsing error, to prevent crash.
            return [{ agent: "CLIAgent", task: "I failed to generate a proper execution plan due to a JSON formatting error. Please rephrase your request." }];
        }
    }
}
