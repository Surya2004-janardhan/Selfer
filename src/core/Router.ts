import * as fs from 'fs';
import { BaseAgent, AgentContext } from '../agents/BaseAgent';
import { LLMProvider, LLMMessage } from './LLMProvider';
import { CLIGui } from '../utils/CLIGui';
import { SkillManager } from './SkillManager';
import { RepoMap } from '../utils/RepoMap';
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
        if (query.startsWith('/')) {
            const command = query.slice(1).toLowerCase().trim();
            if (command === 'skills' || command === '') return SkillManager.getSkillsList();
            const skillContent = SkillManager.getSkillContent(command);
            if (skillContent) return chalk.blue.bold(`--- Skill: ${command} ---\n`) + skillContent;
            return chalk.red(`Unknown command or skill: /${command}`);
        }

        CLIGui.startLoader(`Planning: "${query}"`);

        // Baseline Context: CLAUDE.md + Repo Map
        let projectGuidelines = "";
        if (fs.existsSync('CLAUDE.md')) {
            projectGuidelines = `[PROJECT GUIDELINES]:\n${fs.readFileSync('CLAUDE.md', 'utf-8')}\n`;
        }
        const skeleton = RepoMap.getMap();
        const baseContext = `${projectGuidelines}\n[REPOSITORY SKELETON]:\n${skeleton}\n`;

        const planAgent = this.agents.get('PlanAgent');
        if (!planAgent) {
            CLIGui.stopLoader();
            return "No plan agent found.";
        }

        const plan = await planAgent.run([{ role: 'user', content: `${baseContext}\nUSER REQUEST: ${query}` }], context);

        if (!Array.isArray(plan)) {
            CLIGui.stopLoader();
            return plan;
        }

        CLIGui.updateLoader(`Executing plan (${plan.length} steps)...`);

        let finalResult = "";
        for (let i = 0; i < plan.length; i++) {
            const step = plan[i];
            const displayTask = step.task.length > 50 ? step.task.substring(0, 47) + '...' : step.task;

            const agent = this.agents.get(step.agent);
            if (agent) {
                // Explicit Skill Mention
                let skillContext = "";
                const skillMatch = query.match(/[\.@]([a-zA-Z0-9]+)/);
                if (skillMatch) {
                    const content = SkillManager.getSkillContent(skillMatch[1]);
                    if (content) skillContext = `\n[EXPERT KNOWLEDGE: ${skillMatch[1]}]\n${content}\n`;
                }

                const progressContext = finalResult ? `\n[COMPLETED STEPS]:\n${finalResult}\n` : "";
                const prompt = `--- ENVIRONMENT CONTEXT ---\n${baseContext}${skillContext}${progressContext}\n\n--- CURRENT INSTRUCTION ---\n${step.task}\n\nPerform the instruction using the assigned tools. If you use 'write_file', ensure the content is ONLY what belongs in the file.`;

                let history: LLMMessage[] = [{ role: 'user', content: prompt }];
                let stepTurn = 0;
                let stepSummary = "";

                while (stepTurn < 5) {
                    stepTurn++;
                    CLIGui.updateLoader(`Step ${i + 1}/${plan.length}: ${step.agent} Thinking (Turn ${stepTurn})...`);
                    const agentResponse = await agent.run(history, context);
                    history.push({ role: 'assistant', content: agentResponse });

                    try {
                        const start = agentResponse.indexOf('{');
                        const end = agentResponse.lastIndexOf('}') + 1;

                        if (start !== -1 && end !== -1 && end > start) {
                            const jsonStr = agentResponse.substring(start, end);
                            const parsed = JSON.parse(jsonStr);

                            if (parsed.tool) {
                                CLIGui.updateLoader(`Step ${i + 1}/${plan.length}: ${step.agent} executing ${parsed.tool}...`);
                                const toolResult = await agent.executeTool(parsed.tool, parsed.args);
                                const outStr = toolResult.success ? toolResult.output : `ERROR: ${toolResult.error}`;
                                history.push({ role: 'user', content: `TOOL OUTPUT: ${outStr}\n\nProceed to next action or finish.` });
                                stepSummary += `\n- ${parsed.tool}: ${toolResult.success ? 'success' : 'failed'}`;
                                continue;
                            }
                        }
                    } catch (e) { /* Summary response */ }

                    stepSummary += `\n>> Result: ${agentResponse}`;
                    break;
                }

                finalResult += `\nSTEP ${i + 1}: ${step.task}\n${stepSummary}\n`;
            }
        }

        CLIGui.stopLoader();
        CLIGui.startLoader("Finalizing...");

        const summaryPrompt = `Summarize the following project actions for the user. 
    User Request: "${query}"
    Actions: ${finalResult}
    
    Ensure you confirm if the task was completed successfully. Be concise.`;

        const summary = await this.provider.generateResponse([{ role: 'system', content: summaryPrompt }]);
        return summary.content;
    }
}
