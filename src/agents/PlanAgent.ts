import { BaseAgent, AgentContext } from './BaseAgent';
import { CLIGui } from '../utils/CLIGui';

export class PlanAgent extends BaseAgent {
    constructor(provider: any) {
        super('PlanAgent', provider);
    }

    async run(task: string, context: AgentContext): Promise<any> {
        CLIGui.logAgentAction(this.name, `Planning steps for: ${task}`);

        const systemPrompt = `You are the Plan-Agent for Selfer, an autonomous framework. 
    Your job is to break down a user request into a series of actionable steps that other specialized agents can perform.
    Available Agents: CLI, Git, File, Code, Edits, Web, Browser, Telegram, Memory, Context, Permission, Sub-process, Tracking, Error Recovery, Error Tracker.
    
    Output the plan as a numbered list of steps, specifying which agent should handle each step.`;

        const plan = await this.callLLM(systemPrompt, task);
        return plan;
    }
}
