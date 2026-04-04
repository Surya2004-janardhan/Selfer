import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * ConnectMcpSkill.ts
 * Integrates with Model Context Protocol (MCP) servers.
 * (Ported and renamed from MCPTool)
 */
export class ConnectMcpSkill extends BaseSkill {
  name = 'ConnectMcpSkill';
  description = 'Skill for connecting to and interacting with MCP servers for specialized context.';

  schema = z.object({
    serverCommand: z.string().describe('The command to run the MCP server.'),
    serverArgs: z.array(z.string()).optional().describe('Arguments for the MCP server.')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    const transport = new StdioClientTransport({
        command: input.serverCommand,
        args: input.serverArgs || [],
    });

    const client = new Client({
        name: "Selfer",
        version: "1.0.0",
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        const tools = await client.listTools();
        return { 
          content: `Successfully connected to MCP server. Available tools from server: ${JSON.stringify(tools)}`, 
          isError: false 
        };
    } catch (error: any) {
        return { content: `MCP Connection Error: ${error.message}`, isError: true };
    }
  }
}
