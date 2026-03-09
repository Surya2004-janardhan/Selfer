import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';

export class PlanAgent extends BaseAgent {
    constructor(provider: any) {
        super('PlanAgent', provider);
    }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, task);

        const systemPrompt = `You are the Plan-Agent for Selfer, an autonomous framework. 
    Your job is to break down a user request into a series of actionable steps that other specialized agents can perform.
    Available Agents: CLIAgent, GitAgent, FileAgent, WebAgent, CodeAgent, ReviewAgent, EditsAgent, RoutingAgent, PermissionAgent, TelegramAgent, ContextAgent, SubProcessAgent, TrackingAgent, ErrorRecoveryAgent, ErrorTrackerAgent, BrowserAgent, MemoryAgent.
    
    GUIDELINES:
    1. If the user query is a greeting or casual talk (e.g., "how are you"), route it to CLIAgent with a task to respond friendly.
    2. If the query is unclear, route it to CLIAgent to ask for more context.
    3. For technical tasks, provide a step-by-step JSON plan.
    
    IMPORTANT: You MUST output ONLY a valid JSON array of objects. No preamble, no markdown blocks.
    Format: [ { "agent": "AgentName", "task": "Instruction" }, ... ]`;

        const response = await this.callLLM(systemPrompt, task);

        try {
            // Robust JSON detection
            const jsonStart = response.indexOf('[');
            const jsonEnd = response.lastIndexOf(']') + 1;
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonContent = response.substring(jsonStart, jsonEnd);
                return JSON.parse(jsonContent);
            }
            throw new Error("No JSON array found in response");
        } catch (error) {
            CLIGui.warning("PlanAgent: Falling back to direct CLI response.");
            return [{ agent: "CLIAgent", task: response }];
        }
    }
}
