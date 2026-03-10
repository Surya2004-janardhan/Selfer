import { LLMProvider, LLMMessage } from './LLMProvider';
import { ToolRegistry, ToolResult } from './ToolRegistry';
import { CLIGui } from '../utils/CLIGui';
import chalk from 'chalk';

export class Orchestrator {
    private maxTurns = 25;

    constructor(
        private provider: LLMProvider,
        private toolRegistry: ToolRegistry
    ) { }

    async execute(query: string, context: any): Promise<string> {
        let messages: LLMMessage[] = [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: query }
        ];

        let turn = 0;
        let finalResponse = "";

        while (turn < this.maxTurns) {
            turn++;
            CLIGui.info(`Turn ${turn}/${this.maxTurns}...`);
            CLIGui.info(`System Prompt Tools count: ${this.toolRegistry.getAllToolDefinitions().length}`);

            const response = await this.provider.generateResponse(messages);

            messages.push({ role: 'assistant', content: response.content });

            // Parse tool calls from the response
            const toolCalls = this.parseToolCalls(response.content);
            if (toolCalls.length === 0) {
                finalResponse = response.content;
                break;
            }

            for (const call of toolCalls) {
                try {
                    CLIGui.info(`Executing tool: ${chalk.cyan(call.name)}`);
                    const result: ToolResult = await this.toolRegistry.executeTool(call.name, call.arguments);

                    const resultStr = result.success
                        ? (result.output || JSON.stringify(result.data, null, 2))
                        : `Error: ${result.error}`;

                    messages.push({
                        role: 'user',
                        content: `Tool ${call.name} result: ${resultStr}`
                    });

                    if (result.success) {
                        CLIGui.success(`Tool ${call.name} executed successfully.`);
                    } else {
                        CLIGui.error(`Tool ${call.name} failed: ${result.error}`);
                    }
                } catch (error: any) {
                    CLIGui.error(`Critical tool execution failure: ${error.message}`);
                    messages.push({
                        role: 'user',
                        content: `Tool ${call.name} critical failure: ${error.message}`
                    });
                }
            }
        }

        return finalResponse || "I reached the maximum number of turns without a final response.";
    }

    private getSystemPrompt(): string {
        const tools = this.toolRegistry.getAllToolDefinitions();
        return `You are Selfer, an advanced AI orchestrator inspired by Cline and Aider.
Your goal is to solve the user's task by using the provided tools in a continuous loop.

AVAILABLE TOOLS:
${JSON.stringify(tools, null, 2)}

CORE PRINCIPLES:
1. EXPLORE: If you don't have enough information, use search or read tools first.
2. ACT: Perform discrete actions (write file, commit, etc.) one by one.
3. OBSERVE: Analyze the results of your actions. If a tool fails, try to understand why and correct it.
4. REASON: Before calling a tool, explain your reasoning in natural language.

OUTPUT FORMAT:
To use a tool, you MUST wrap the tool call in <tool_call> tags.
Example:
<tool_call>
{
  "name": "write_file",
  "arguments": { "path": "test.txt", "content": "hello world" }
}
</tool_call>

You can call multiple tools in one turn if they are independent.
Once you have fully completed the task, provide a concise summary of your actions as your final response.`;
    }

    private parseToolCalls(content: string): any[] {
        const toolCalls: any[] = [];
        const regex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            try {
                const call = JSON.parse(match[1].trim());
                if (call.name && call.arguments) {
                    toolCalls.push(call);
                }
            } catch (e) {
                CLIGui.error("Failed to parse tool call JSON: " + match[1]);
            }
        }
        return toolCalls;
    }
}
