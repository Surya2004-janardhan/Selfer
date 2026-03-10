import { ToolRegistry } from './ToolRegistry';
import { BaseAgent } from '../agents/BaseAgent';
import { FileAgent } from '../agents/FileAgent';
import { GitAgent } from '../agents/GitAgent';
import { EditsAgent } from '../agents/EditsAgent';
import { CodeAgent } from '../agents/CodeAgent';
import { WebAgent } from '../agents/WebAgent';
import { BrowserAgent } from '../agents/BrowserAgent';
import { MemoryAgent } from '../agents/MemoryAgent';

import { ReviewAgent } from '../agents/ReviewAgent';
import { TelegramAgent } from '../agents/TelegramAgent';
import { ContextAgent } from '../agents/ContextAgent';
import { SubProcessAgent } from '../agents/SubProcessAgent';
import { TrackingAgent } from '../agents/TrackingAgent';
import { ErrorRecoveryAgent } from '../agents/ErrorRecoveryAgent';
import { ErrorTrackerAgent } from '../agents/ErrorTrackerAgent';

export class NativeToolFactory {
    static registerAll(registry: ToolRegistry, provider: any) {
        const agents: BaseAgent[] = [
            new FileAgent(provider),
            new GitAgent(provider),
            new EditsAgent(provider),
            new CodeAgent(provider),
            new WebAgent(provider),
            new BrowserAgent(provider),
            new MemoryAgent(provider),
            new ReviewAgent(provider),
            new TelegramAgent(provider),
            new ContextAgent(provider),
            new SubProcessAgent(provider),
            new TrackingAgent(provider),
            new ErrorRecoveryAgent(provider),
            new ErrorTrackerAgent(provider)
        ];

        for (const agent of agents) {
            const tools = agent.getTools();
            for (const tool of tools) {
                registry.registerNativeTool({
                    ...tool,
                    execute: (args) => agent.executeTool(tool.name, args),
                    source: 'native'
                });
            }
        }
    }
}
