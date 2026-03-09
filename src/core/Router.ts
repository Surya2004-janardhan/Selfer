import { BaseAgent, AgentContext } from '../agents/BaseAgent';
import { LLMProvider } from './LLMProvider';
import { CLIGui } from '../utils/CLIGui';

export class Router {
    private agents: Map<string, BaseAgent> = new Map();

    constructor(private provider: LLMProvider) { }

    registerAgent(agent: BaseAgent) {
        this.agents.set(agent.getName(), agent);
    }

    async routeTask(query: string, context: AgentContext) {
        CLIGui.logAgentAction('Router', `Deciding flow for: "${query}"`);

        // In a real implementation, the Router would use LLM to decide which agent to call.
        // For this implementation, we'll start with a simple PlanAgent.

        const planAgent = this.agents.get('PlanAgent');
        if (planAgent) {
            const plan = await planAgent.run(query, context);
            CLIGui.logReasoning('Plan generated. Executing agents based on plan...');
            return plan;
        }

        return "No plan agent found.";
    }
}
