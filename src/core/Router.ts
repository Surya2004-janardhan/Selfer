import { BaseAgent, AgentContext } from '../agents/BaseAgent';
import { LLMProvider } from './LLMProvider';
import { CLIGui } from '../utils/CLIGui';
import { SkillManager } from './SkillManager';
import chalk from 'chalk';

export class Router {
    private agents: Map<string, BaseAgent> = new Map();

    constructor(private provider: LLMProvider) {
        SkillManager.init();
    }

    registerAgent(agent: BaseAgent) {
        this.agents.set(agent.getName(), agent);
    }

    async routeTask(query: string, context: AgentContext) {
        // Handle / commands
        if (query.startsWith('/')) {
            const command = query.slice(1).toLowerCase();
            if (command === 'skills') {
                return SkillManager.getSkillsList();
            }
            const skillContent = SkillManager.getSkillContent(command);
            if (skillContent) {
                return chalk.blue.bold(`--- Skill: ${command} ---\n`) + skillContent;
            }
            return chalk.red(`Unknown command or skill: /${command}`);
        }

        CLIGui.startLoader(`Thinking about: "${query}"`);

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

        // Generate human-like summary
        CLIGui.startLoader("Thinking...");
        const summaryPrompt = `You are Selfer, a helpful and friendly autonomous assistant. 
    The user asked: "${query}"
    You completed these actions: ${finalResult}
    
    Now, tell the user what you accomplished in a natural, conversational, and direct "human-to-human" way. 
    Avoid sounding like a clinical report or listing "Step 1, Step 2". 
    Just describe what you did and why it matters in about 4-5 lines. 
    Start directly with the response, no "Here is a summary" or "Successfully executed".`;

        const summary = await this.provider.generateResponse([{ role: 'system', content: summaryPrompt }]);
        CLIGui.stopLoader();

        return summary.content;
    }
}
