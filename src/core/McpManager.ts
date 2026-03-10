import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from 'fs';
import * as path from 'path';
import { CLIGui } from '../utils/CLIGui';

export interface McpServerConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
}

export interface McpSettings {
    mcpServers: Record<string, McpServerConfig>;
}

export class McpManager {
    private connections: Map<string, { client: Client, transport: StdioClientTransport }> = new Map();
    private settingsPath: string;

    constructor(private rootDir: string) {
        this.settingsPath = path.join(this.rootDir, '.selfer', 'mcp_settings.json');
        this.initSettings();
    }

    private initSettings() {
        if (!fs.existsSync(path.dirname(this.settingsPath))) {
            fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
        }
        if (!fs.existsSync(this.settingsPath)) {
            const defaultSettings: McpSettings = {
                mcpServers: {}
            };
            fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
        }
    }

    async connectAll() {
        const settings: McpSettings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
        for (const [name, config] of Object.entries(settings.mcpServers)) {
            try {
                await this.connect(name, config);
            } catch (error: any) {
                CLIGui.error(`Failed to connect to MCP server ${name}: ${error.message}`);
            }
        }
    }

    async connect(name: string, config: McpServerConfig) {
        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: this.getCleanEnv(config.env)
        });

        const client = new Client({
            name: "Selfer",
            version: "1.0.0"
        }, {
            capabilities: {}
        });

        await client.connect(transport);
        this.connections.set(name, { client, transport });
        CLIGui.success(`Connected to MCP server: ${name}`);
    }

    async getAllTools() {
        const allTools = [];
        for (const [serverName, { client }] of this.connections.entries()) {
            try {
                const response = await client.listTools();
                if (response && response.tools) {
                    for (const tool of response.tools) {
                        CLIGui.info(`Discovered tool: ${tool.name} from ${serverName}`);
                        allTools.push({
                            ...tool,
                            serverName
                        });
                    }
                }
            } catch (error: any) {
                CLIGui.error(`Failed to list tools for ${serverName}: ${error.message}`);
                if (error.stack) console.error(error.stack);
            }
        }
        return allTools;
    }

    async callTool(serverName: string, toolName: string, args: any) {
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`MCP server ${serverName} not found or not connected`);
        }

        return await connection.client.callTool({
            name: toolName,
            arguments: args
        });
    }

    private getCleanEnv(customEnv?: Record<string, string>): Record<string, string> {
        const cleanEnv: Record<string, string> = {};
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
                cleanEnv[key] = value;
            }
        }
        if (customEnv) {
            for (const [key, value] of Object.entries(customEnv)) {
                if (value !== undefined) {
                    cleanEnv[key] = value;
                }
            }
        }
        return cleanEnv;
    }

    async dispose() {
        for (const [name, { transport }] of this.connections.entries()) {
            await transport.close();
        }
        this.connections.clear();
    }
}
