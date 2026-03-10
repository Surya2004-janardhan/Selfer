import * as fs from 'fs';
import { BaseAgent, AgentContext } from '../agents/BaseAgent';
import { LLMProvider, LLMMessage } from './LLMProvider';
import { CLIGui } from '../utils/CLIGui';
import { SkillManager } from './SkillManager';
import { RepoMap } from '../utils/RepoMap';
import { ToolValidator } from '../utils/ToolValidator';
import { ContextGuard } from '../utils/ContextGuard';
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

        const fullSkeleton = RepoMap.getMap();
        const minimalTree = RepoMap.getTree();
        const baseContext = `${projectGuidelines}\n[REPOSITORY SKELETON]:\n${fullSkeleton}\n`;

        const planAgent = this.agents.get('PlanAgent');
        if (!planAgent) {
            CLIGui.stopLoader();
            return "No plan agent found.";
        }

        let plan: any[] = [];
        let planRetries = 0;
        let planningQuery = query;
        let rawPlanResponse = "";

        while (planRetries < 2) {
            const resp = await planAgent.run([{ role: 'user', content: `${baseContext}\nUSER REQUEST: ${planningQuery}` }], context);
            rawPlanResponse = typeof resp === 'string' ? resp : JSON.stringify(resp);

            try {
                let jsonStr = rawPlanResponse;
                const codeBlockMatch = rawPlanResponse.match(/```json\s*([\s\S]*?)```/);
                if (codeBlockMatch) {
                    jsonStr = codeBlockMatch[1];
                } else {
                    const start = rawPlanResponse.indexOf('[');
                    const end = rawPlanResponse.lastIndexOf(']') + 1;
                    if (start !== -1 && end !== -1 && end >= start) {
                        jsonStr = rawPlanResponse.substring(start, end);
                    }
                }

                const parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed)) {
                    plan = parsed;
                    break;
                }
            } catch (e) { /* malformed */ }

            planRetries++;
            if (planRetries < 2) {
                CLIGui.updateLoader(`Plan malformed. Retrying (${planRetries}/1)...`);
                planningQuery += `\n\n[SYSTEM ALERT]: Your previous response was not a valid JSON array. Please ensure your output is ONLY a JSON array like: [ { "agent": "...", "task": "..." } ]`;
            }
        }

        if (plan.length === 0) {
            CLIGui.stopLoader();
            return chalk.red(`[ERROR]: Failed to generate a valid execution plan after retries.\n\nRAW RESPONSE:\n${rawPlanResponse}`);
        }

        CLIGui.updateLoader(`Executing plan (${plan.length} steps)...`);

        let finalResult = "";
        for (let i = 0; i < plan.length; i++) {
            const step = plan[i];
            const agent = this.agents.get(step.agent);
            if (agent) {
                // Targeted Context Pruning
                let workerContext = minimalTree;

                const taskFiles = step.task.match(/[a-zA-Z0-9.\-_/]+\.(ts|js|md|json|txt)/g) || [];
                taskFiles.forEach((file: string) => {
                    const sigs = RepoMap.getFileSignatures(file);
                    if (sigs) workerContext += `\n${sigs}`;
                });

                let skillContext = "";
                const skillMatch = query.match(/[\.@]([a-zA-Z0-9]+)/);
                if (skillMatch) {
                    const content = SkillManager.getSkillContent(skillMatch[1]);
                    if (content) skillContext = `\n[EXPERT KNOWLEDGE: ${skillMatch[1]}]\n${content}\n`;
                }

                const progressContext = finalResult ? `\n[COMPLETED STEPS]:\n${finalResult}\n` : "";
                const contextToUse = (step.agent === 'ContextAgent' || step.agent === 'PlanAgent') ? fullSkeleton : workerContext;
                const envContext = `${projectGuidelines}\n[ENVIRONMENT CONTEXT]:\n${contextToUse}${skillContext}${progressContext}`;
                const prompt = `${envContext}\n\n--- CURRENT INSTRUCTION ---\n${step.task}\n\nPerform the instruction using the assigned tools. Reasoning is encouraged but ensure the tool call is valid JSON.`;

                let history: LLMMessage[] = [{ role: 'user', content: prompt }];
                let stepTurn = 0;
                let stepSummary = "";
                let toolUsedInStep = false;

                while (stepTurn < 5) {
                    stepTurn++;
                    CLIGui.updateLoader(`Step ${i + 1}/${plan.length}: ${step.agent} Thinking...`);
                    const agentResponse = await agent.run(history, context);

                    const reasoningMatch = agentResponse.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
                    if (reasoningMatch) {
                        CLIGui.logReasoning(reasoningMatch[1].trim());
                    }

                    try {
                        let jsonStr = agentResponse;
                        const codeBlockMatch = agentResponse.match(/```json\s*([\s\S]*?)```/);
                        if (codeBlockMatch) {
                            jsonStr = codeBlockMatch[1];
                        } else {
                            const start = agentResponse.indexOf('{');
                            const end = agentResponse.lastIndexOf('}') + 1;
                            if (start !== -1 && end !== -1 && end > start) {
                                jsonStr = agentResponse.substring(start, end);
                            }
                        }

                        const parsed = JSON.parse(jsonStr);

                        if (parsed && typeof parsed === 'object' && parsed.tool) {
                            toolUsedInStep = true;
                            const tools = agent.getTools();
                            const toolDef = tools.find(t => t.name === parsed.tool);
                            if (toolDef) {
                                const validation = ToolValidator.validate(toolDef, parsed.args);
                                if (!validation.valid) {
                                    history.push({ role: 'assistant', content: agentResponse });
                                    history.push({ role: 'user', content: `VALIDATION ERROR: ${validation.error}. Please correct your tool call.` });
                                    continue;
                                }
                            }

                            CLIGui.logAgentAction(step.agent, `Executing ${parsed.tool}...`);
                            let toolResult = await agent.executeTool(parsed.tool, parsed.args);

                            if (toolResult.success) {
                                toolResult.output = ContextGuard.wrapOutput(toolResult.output);
                            }

                            if (!toolResult.success) {
                                const recoveryAgent = this.agents.get('ErrorRecoveryAgent');
                                if (recoveryAgent) {
                                    CLIGui.logAgentAction(step.agent, `${chalk.red('Failed')}. Consulting Recovery Agent...`);
                                    const recoveryAdvice = await recoveryAgent.run([
                                        { role: 'user', content: `Failed Tool: ${parsed.tool}\nError: ${toolResult.error}\nIntent: ${step.task}` }
                                    ], context);
                                    history.push({ role: 'assistant', content: agentResponse });
                                    history.push({ role: 'user', content: `TOOL ERROR: ${toolResult.error}\nRECOVERY ADVICE: ${recoveryAdvice}\n\nPlease try again.` });
                                    stepSummary += `\n- ${parsed.tool}: failed (recovery advised)`;
                                    continue;
                                }
                            }

                            const outStr = toolResult.success ? toolResult.output : `ERROR: ${toolResult.error}`;
                            history.push({ role: 'assistant', content: agentResponse });
                            history.push({ role: 'user', content: `TOOL OUTPUT: ${outStr}\n\nProceed to next action or finish.` });
                            stepSummary += `\n- ${parsed.tool}: ${toolResult.success ? 'success' : 'failed'}`;
                            continue;
                        }
                    } catch (e) { /* Summary response */ }

                    // Verbal Instruction Detection
                    const instructionalPhrases = ['step 1', 'you should', 'to do this', 'first,', 'then,', 'finally,', 'run the command'];
                    const isInstructional = instructionalPhrases.some(p => agentResponse.toLowerCase().includes(p));

                    // Zero-Tool Detection & verbal instruction pushback
                    const exemptAgents = ['CLIAgent', 'MemoryAgent', 'ContextAgent'];
                    const needsAction = !exemptAgents.includes(step.agent);

                    if (needsAction && !toolUsedInStep && (isInstructional || stepTurn < 3)) {
                        history.push({ role: 'assistant', content: agentResponse });
                        const alert = isInstructional
                            ? `[SYSTEM ALERT]: You are giving instructions instead of executing tools. You must call a tool (JSON) to perform the task. Do NOT provide "how-to" advice.`
                            : `[SYSTEM ALERT]: No tool call detected. As the ${step.agent}, you MUST perform the task using your tools. Proceed with JSON.`;
                        history.push({ role: 'user', content: alert });
                        continue;
                    }

                    if (!toolUsedInStep) {
                        stepSummary += `\n>> Result: ${agentResponse}`;
                    }
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
        CLIGui.stopLoader();

        return summary.content;
    }
}
