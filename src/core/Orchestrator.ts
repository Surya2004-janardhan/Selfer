import { LLMProvider, LLMMessage } from './LLMProvider';
import { ToolRegistry, ToolResult } from './ToolRegistry';
import { SystemPromptBuilder } from './SystemPromptBuilder';
import { CLIGui } from '../utils/CLIGui';
import { ContextGuard } from '../utils/ContextGuard';
import { TokenCounter } from '../utils/TokenCounter';
import { ModelRegistry } from './ModelRegistry';
import { Logger } from '../utils/Logger';
import chalk from 'chalk';
import * as os from 'os';
import * as readline from 'readline';

/** Maximum reflections per turn before giving up on recovery. */
const MAX_REFLECTIONS = 3;

/** Maximum consecutive identical errors before breaking the loop early. */
const MAX_SAME_ERROR = 3;

export class Orchestrator {
    private maxTurns = 25;
    private modelName: string;

    constructor(
        private provider: LLMProvider,
        private toolRegistry: ToolRegistry,
        modelName?: string
    ) {
        this.modelName = modelName || 'gpt-4o';
    }

    async execute(query: string, context: any): Promise<string> {
        const systemPrompt = SystemPromptBuilder.build({
            cwd: process.cwd(),
            platform: os.platform(),
            shell: process.env.SHELL || 'cmd.exe',
            date: new Date().toISOString().split('T')[0],
            tools: this.toolRegistry.getAllToolDefinitions(),
            activeTerminals: []
        });

        let messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ];

        const contextWindow = ModelRegistry.getContextWindow(this.modelName);
        const safeBudget = ModelRegistry.getSafeBudget(this.modelName);

        let turn = 0;
        let finalResponse = '';
        let reflections = 0;
        const errorCounts: Map<string, number> = new Map();

        while (turn < this.maxTurns) {
            turn++;

            // ── Token budget guard ────────────────────────────────────────────
            const estimatedTokens = TokenCounter.estimateMessages(messages);
            if (estimatedTokens > safeBudget) {
                CLIGui.warning(`Context budget nearly exhausted (est. ${estimatedTokens}/${contextWindow} tokens). Trimming older messages.`);
                messages = this.trimMessages(messages, safeBudget);
            }

            CLIGui.info(`Turn ${turn}/${this.maxTurns} (est. ~${estimatedTokens} tokens)`);
            Logger.debug(`Turn ${turn}: estimated tokens=${estimatedTokens}`);

            let response;
            try {
                // Use streaming if the provider supports it for better UX
                if (this.provider.supportsStreaming()) {
                    CLIGui.startStream();
                    response = await this.provider.generateResponseStream(messages, (chunk) => {
                        CLIGui.writeStreamChunk(chunk);
                    });
                    CLIGui.endStream();
                } else {
                    CLIGui.startLoader('Thinking...');
                    response = await this.provider.generateResponse(messages);
                    CLIGui.stopLoader();
                }
            } catch (err: any) {
                CLIGui.stopLoader();
                // Context overflow from provider — trim and retry once
                if (this.isContextOverflow(err)) {
                    CLIGui.warning('Context window exceeded. Trimming messages and retrying...');
                    messages = this.trimMessages(messages, Math.floor(safeBudget * 0.6));
                    try {
                        if (this.provider.supportsStreaming()) {
                            CLIGui.startStream();
                            response = await this.provider.generateResponseStream(messages, (chunk) => {
                                CLIGui.writeStreamChunk(chunk);
                            });
                            CLIGui.endStream();
                        } else {
                            response = await this.provider.generateResponse(messages);
                        }
                    } catch (retryErr: any) {
                        CLIGui.error(`LLM call failed after trim: ${retryErr.message}`);
                        return `Task failed: LLM error — ${retryErr.message}`;
                    }
                } else {
                    CLIGui.error(`LLM call failed: ${err.message}`);
                    return `Task failed: LLM error — ${err.message}`;
                }
            }

            const content = response.content || '';
            messages.push({ role: 'assistant', content });

            if (response.usage) {
                Logger.info(`LLM usage: ${response.usage.promptTokens} in / ${response.usage.completionTokens} out / ${response.usage.totalTokens} total`);
                CLIGui.showTokenUsage(response.usage.promptTokens, response.usage.completionTokens, response.usage.totalTokens);
            }

            // ── Parse tool calls ──────────────────────────────────────────────
            const toolCalls = this.parseXmlToolCalls(content);

            if (toolCalls.length === 0) {
                // No tool calls — check if the LLM just forgot to use tools
                if (reflections < MAX_REFLECTIONS && this.looksLikeUnformattedToolCall(content)) {
                    reflections++;
                    const reflectionMsg = `[System] Your response appears to contain a tool call but was not formatted correctly as XML. ` +
                        `You MUST wrap tool calls in XML tags as described in the TOOL USE section. ` +
                        `Reflection ${reflections}/${MAX_REFLECTIONS}: Please retry with correct XML formatting.`;
                    messages.push({ role: 'user', content: reflectionMsg });
                    CLIGui.warning(`Reflection ${reflections}: Asking LLM to reformat tool call.`);
                    continue;
                }

                finalResponse = content;
                break;
            }

            reflections = 0; // reset reflection counter on successful parse

            // ── Handle control-signal tools before execution ──────────────────
            const completionCall = toolCalls.find(c => c.name === 'attempt_completion');
            if (completionCall) {
                finalResponse = completionCall.arguments.result || content;
                if (completionCall.arguments.command) {
                    finalResponse += `\n\nSuggested verification command: \`${completionCall.arguments.command}\``;
                }
                break;
            }

            const followupCall = toolCalls.find(c => c.name === 'ask_followup_question');
            if (followupCall) {
                const question = followupCall.arguments.question || 'What would you like to do next?';
                CLIGui.stopLoader();
                const userAnswer = await this.promptUser(question);
                CLIGui.startLoader('Continuing...');
                messages.push({ role: 'user', content: userAnswer });
                continue;
            }

            // ── Execute tools ─────────────────────────────────────────────────
            for (const call of toolCalls) {
                CLIGui.info(`Executing tool: ${chalk.cyan(call.name)}`);
                Logger.debug(`Executing tool: ${call.name}`, { args: call.arguments });

                try {
                    const result: ToolResult = await this.toolRegistry.executeTool(call.name, call.arguments);

                    const rawOutput = result.success
                        ? (result.output || JSON.stringify(result.data, null, 2) || '(no output)')
                        : `Error: ${result.error}`;

                    // Truncate large outputs to protect the context window
                    const truncatedOutput = ContextGuard.truncate(rawOutput);

                    messages.push({
                        role: 'user',
                        content: `[Observation] Tool '${call.name}' result:\n${truncatedOutput}`
                    });

                    if (result.success) {
                        CLIGui.success(`Tool ${chalk.cyan(call.name)} executed successfully.`);
                        errorCounts.delete(call.name); // clear error streak on success
                    } else {
                        CLIGui.error(`Tool ${call.name} failed: ${result.error}`);
                        const count = (errorCounts.get(call.name) || 0) + 1;
                        errorCounts.set(call.name, count);

                        if (count >= MAX_SAME_ERROR) {
                            CLIGui.warning(`Tool ${call.name} failed ${count} times in a row. Asking LLM to try a different approach.`);
                            messages.push({
                                role: 'user',
                                content: `[System] Tool '${call.name}' has failed ${count} consecutive times with the same error. ` +
                                    `Please try a fundamentally different approach to complete the task.`
                            });
                        } else if (reflections < MAX_REFLECTIONS) {
                            // Add a targeted reflection message
                            const recoveryHint = this.buildRecoveryHint(call.name, result.error || 'unknown error');
                            messages.push({
                                role: 'user',
                                content: `[Reflection] ${recoveryHint} (attempt ${count}/${MAX_SAME_ERROR})`
                            });
                            reflections++;
                        }
                    }
                } catch (error: any) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    CLIGui.error(`Critical tool execution failure: ${errMsg}`);
                    Logger.error(`Tool ${call.name} threw an exception`, { error: errMsg });
                    messages.push({
                        role: 'user',
                        content: `[Observation] Tool '${call.name}' critical failure: ${errMsg}\n` +
                            `[Reflection] This is an unexpected error. Verify the tool arguments are correct and try again.`
                    });
                }
            }
        }

        if (!finalResponse) {
            finalResponse = 'I reached the maximum number of turns without a final response.';
        }

        return finalResponse;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Parses XML-style tool calls from LLM response content.
     * Skips tool names that appear inside code fences to avoid false positives.
     */
    private parseXmlToolCalls(content: string): Array<{ name: string; arguments: any }> {
        const toolCalls: Array<{ name: string; arguments: any }> = [];

        // Remove code blocks so tool names inside them are not matched
        const contentWithoutCode = content
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`[^`]*`/g, '');

        const tools = this.toolRegistry.getAllToolDefinitions();

        for (const tool of tools) {
            // Use greedy matching to handle multi-line content correctly;
            // the outer tag wraps the entire argument block.
            const pattern = new RegExp(`<${tool.name}>([\\s\\S]*?)<\\/${tool.name}>`, 'g');
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(contentWithoutCode)) !== null) {
                const innerContent = match[1];
                const args: Record<string, string> = {};

                const argNames = Object.keys(tool.parameters.properties || {});
                for (const argName of argNames) {
                    const argPattern = new RegExp(`<${argName}>([\\s\\S]*?)<\\/${argName}>`, 'i');
                    const argMatch = argPattern.exec(innerContent);
                    if (argMatch) {
                        args[argName] = argMatch[1].trim();
                    }
                }

                toolCalls.push({ name: tool.name, arguments: args });
            }
        }

        return toolCalls;
    }

    /** Heuristic: does the response mention tool names but lack XML tags? */
    private looksLikeUnformattedToolCall(content: string): boolean {
        const toolNames = this.toolRegistry.getAllToolDefinitions().map(t => t.name);
        return toolNames.some(name =>
            content.includes(name) && !content.includes(`<${name}>`)
        );
    }

    /** Trim the messages array to keep token usage within budget. */
    private trimMessages(messages: LLMMessage[], targetTokens: number): LLMMessage[] {
        if (messages.length <= 2) return messages; // Always keep system + initial user

        const system = messages[0];
        const initial = messages[1];
        const rest = messages.slice(2);

        // Drop older observation/tool messages from the middle first
        while (rest.length > 1 && TokenCounter.estimateMessages([system, initial, ...rest]) > targetTokens) {
            rest.splice(1, 1); // remove second element (oldest middle message)
        }

        return [system, initial, ...rest];
    }

    /** Detect provider errors indicating context window overflow. */
    private isContextOverflow(error: any): boolean {
        const msg: string = (error?.message || '').toLowerCase();
        const status: number = error?.response?.status || error?.status || 0;
        return (
            msg.includes('context_length_exceeded') ||
            msg.includes('context window') ||
            msg.includes('too many tokens') ||
            msg.includes('maximum context') ||
            status === 413
        );
    }

    /** Build a targeted recovery hint based on the tool name and error. */
    private buildRecoveryHint(toolName: string, errorMessage: string): string {
        const err = errorMessage.toLowerCase();

        if (toolName === 'apply_search_replace' || err.includes('search block')) {
            return `The SEARCH block did not match the file content. ` +
                `Use 'read_file' to get the exact current content of the file, ` +
                `then retry with a SEARCH block that exactly matches (including whitespace and indentation).`;
        }
        if (err.includes('file not found') || err.includes('no such file')) {
            return `The file was not found. Use 'list_files' to discover the correct path before retrying.`;
        }
        if (err.includes('permission') || err.includes('eacces')) {
            return `Permission denied. Check that the path is within the project directory and you have write access.`;
        }
        if (toolName.startsWith('git_')) {
            return `Git command failed. Run 'git_status' first to check the repository state, then retry.`;
        }
        if (toolName === 'execute_command' || toolName === 'execute') {
            return `Command execution failed. Check the command syntax and ensure all required programs are installed.`;
        }

        return `Tool '${toolName}' failed with: "${errorMessage}". Review the arguments and retry with corrections.`;
    }

    /** Prompt the user for input (used by ask_followup_question). */
    private promptUser(question: string): Promise<string> {
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question(`\n${chalk.yellow.bold('Selfer asks:')} ${question}\n${chalk.cyan('Your answer:')} `, answer => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }

    private startLoader(message: string): void {
        CLIGui.startLoader(message);
    }

    private stopLoader(): void {
        CLIGui.stopLoader();
    }
}
