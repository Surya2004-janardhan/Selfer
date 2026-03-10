import { McpManager } from './McpManager';

export interface Tool {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
        [key: string]: any;
    };
}

export interface ToolResult {
    success: boolean;
    output?: string;
    error?: string;
    data?: any;
}

export interface ToolDefinition extends Tool {
    execute: (args: any) => Promise<ToolResult>;
    source: 'native' | 'mcp';
    serverName?: string;
}

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    constructor(private mcpManager: McpManager) { }

    registerNativeTool(tool: ToolDefinition) {
        this.tools.set(tool.name, tool);
    }

    async syncMcpTools() {
        const mcpTools = await this.mcpManager.getAllTools();
        for (const tool of mcpTools) {
            this.tools.set(tool.name, {
                name: tool.name,
                description: tool.description || "No description provided",
                parameters: tool.inputSchema,
                execute: async (args) => {
                    const res = await this.mcpManager.callTool(tool.serverName, tool.name, args);
                    return {
                        success: !res.isError,
                        output: JSON.stringify(res.content, null, 2),
                        data: res.content
                    };
                },
                source: 'mcp',
                serverName: tool.serverName
            });
        }
    }

    getAllToolDefinitions(): Tool[] {
        return Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }));
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }
        return await tool.execute(args);
    }

    getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }
}
