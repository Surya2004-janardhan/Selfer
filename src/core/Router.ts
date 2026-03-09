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
        CLIGui.startLoader(`Deciding flow for: "${query}"`);

        const planAgent = this.agents.get('PlanAgent');
        if (!planAgent) {
            CLIGui.stopLoader();
            return "No plan agent found.";
        }

        const plan = await planAgent.run(query, context);

        if (!Array.isArray(plan)) {
            CLIGui.stopLoader();
            return plan;
        }

        CLIGui.updateLoader(`Plan generated with ${plan.length} steps. Executing...`);

        let finalResult = "";
        for (let i = 0; i < plan.length; i++) {
            const step = plan[i];
            CLIGui.updateLoader(`Step ${i + 1}/${plan.length}: ${step.agent} -> ${step.task}`);

            const agent = this.agents.get(step.agent);
            if (agent) {
                const result = await agent.run(step.task, context);
                finalResult += `\nStep ${i + 1} Result: ${result}`;
            } else {
                CLIGui.error(`Agent ${step.agent} not found for step ${i + 1}`);
            }
        }

        CLIGui.stopLoader();
        CLIGui.success(`Task completed autonomously!`);

        // Generate concise summary
        CLIGui.startLoader("Summarizing run...");
        const summaryPrompt = `You are Selfer, an autonomous framework. 
    Review the original user query and the results of the steps taken by your agents.
    Generate a professional, accurate summary of what was accomplished in exactly 4-5 lines.
    User Query: "${query}"
    Execution Results: ${finalResult}`;

        const summary = await this.provider.generateResponse([{ role: 'system', content: summaryPrompt }]);
        CLIGui.stopLoader();

        return summary.content;
    }
}
