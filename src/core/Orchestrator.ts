import { LLMProvider, LLMMessage } from './LLMProvider';
import { ToolRegistry, ToolResult } from './ToolRegistry';
import { SystemPromptBuilder } from './SystemPromptBuilder';
import { CLIGui } from '../utils/CLIGui';
import chalk from 'chalk';
import * as os from 'os';

export class Orchestrator {
    private maxTurns = 25;

    constructor(
        private provider: LLMProvider,
        private toolRegistry: ToolRegistry
    ) { }

    async execute(query: string, context: any): Promise<string> {
        const systemPrompt = SystemPromptBuilder.build({
            cwd: process.cwd(),
            platform: os.platform(),
            shell: process.env.SHELL || 'cmd.exe',
            date: new Date().toISOString().split('T')[0],
            tools: this.toolRegistry.getAllToolDefinitions(),
            activeTerminals: [] // Could be populated in a more complex setup
        });

        let messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ];

        let turn = 0;
        let finalResponse = "";

        while (turn < this.maxTurns) {
            turn++;
            CLIGui.info(`Turn ${turn}/${this.maxTurns}...`);

            const response = await this.provider.generateResponse(messages);
            messages.push({ role: 'assistant', content: response.content });

            // Parse XML-style tool calls
            const toolCalls = this.parseXmlToolCalls(response.content);
            if (toolCalls.length === 0) {
                finalResponse = response.content;
                break;
            }

            let shouldTerminate = false;
            for (const call of toolCalls) {
                if (call.name === 'attempt_completion') {
                    shouldTerminate = true;
                    finalResponse = call.arguments.result;
                    if (call.arguments.command) {
                        finalResponse += `\n\nSuggested verification command: \`${call.arguments.command}\``;
                    }
                }
                if (call.name === 'ask_followup_question') {
                    shouldTerminate = true;
                    finalResponse = `Question to user: ${call.arguments.question}`;
                }

                try {
                    CLIGui.info(`Executing tool: ${chalk.cyan(call.name)}`);
                    const result: ToolResult = await this.toolRegistry.executeTool(call.name, call.arguments);

                    const resultStr = result.success
                        ? (result.output || JSON.stringify(result.data, null, 2))
                        : `Error: ${result.error}`;

                    messages.push({
                        role: 'user',
                        content: `[Observation] Tool '${call.name}' result:\n${resultStr}`
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
                        content: `[Observation] Tool '${call.name}' critical failure: ${error.message}`
                    });
                }
            }

            if (shouldTerminate) break;
        }

        return finalResponse || "I reached the maximum number of turns without a final response.";
    }

    private parseXmlToolCalls(content: string): any[] {
        const toolCalls: any[] = [];
        const tools = this.toolRegistry.getAllToolDefinitions();

        for (const tool of tools) {
            const pattern = new RegExp(`<${tool.name}>([\\s\\S]*?)</${tool.name}>`, 'g');
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const innerContent = match[1];
                const args: any = {};

                // Parse arguments like <arg_name>value</arg_name>
                const argNames = Object.keys(tool.parameters.properties || {});
                for (const argName of argNames) {
                    const argPattern = new RegExp(`<${argName}>([\\s\\S]*?)</${argName}>`, 'i');
                    const argMatch = argPattern.exec(innerContent);
                    if (argMatch) {
                        args[argName] = argMatch[1].trim();
                    }
                }

                toolCalls.push({
                    name: tool.name,
                    arguments: args
                });
            }
        }

        return toolCalls;
    }
}
