import { AgentContext } from '../agents/BaseAgent';
import { LLMProvider } from './LLMProvider';
import { CLIGui } from '../utils/CLIGui';
import { SkillManager } from './SkillManager';
import { McpManager } from './McpManager';
import { ToolRegistry } from './ToolRegistry';
import { Orchestrator } from './Orchestrator';
import { NativeToolFactory } from './NativeToolFactory';
import chalk from 'chalk';

export class Router {
    private mcpManager: McpManager;
    private toolRegistry: ToolRegistry;
    private orchestrator: Orchestrator;

    constructor(private provider: LLMProvider, modelName?: string) {
        SkillManager.init();
        this.mcpManager = new McpManager(process.cwd());
        this.toolRegistry = new ToolRegistry(this.mcpManager);
        this.orchestrator = new Orchestrator(this.provider, this.toolRegistry, modelName);

        // Register all native agent tools
        NativeToolFactory.registerAll(this.toolRegistry, this.provider);
    }

    async init() {
        await this.mcpManager.connectAll();
        await this.toolRegistry.syncMcpTools();
    }

    async routeTask(query: string, context: AgentContext) {
        if (query.startsWith('/')) {
            const command = query.slice(1).toLowerCase().trim();
            if (command === 'skills' || command === '') return SkillManager.getSkillsList();
            const skillContent = SkillManager.getSkillContent(command);
            if (skillContent) return chalk.blue.bold(`--- Skill: ${command} ---\n`) + skillContent;
            return chalk.red(`Unknown command or skill: /${command}`);
        }

        CLIGui.startLoader(`Thinking: "${query}"`);

        try {
            const result = await this.orchestrator.execute(query, context);
            CLIGui.stopLoader();
            return result;
        } catch (error: any) {
            CLIGui.stopLoader();
            CLIGui.error(`Orchestration failed: ${error.message}`);
            return `Failed to execute task: ${error.message}`;
        }
    }
}
