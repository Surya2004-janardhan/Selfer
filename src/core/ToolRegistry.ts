export interface Tool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required: string[];
    };
}

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export class ToolRegistry {
    private static tools: Map<string, Tool> = new Map();

    static register(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    static getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    static getAllTools(): Tool[] {
        return Array.from(this.tools.values());
    }
}
