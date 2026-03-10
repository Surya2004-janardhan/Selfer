import { BaseAgent, AgentContext } from './BaseAgent';
import { Tool, ToolResult } from '../core/ToolRegistry';
import { LLMMessage, LLMProvider } from '../core/LLMProvider';

export class TaskAgent extends BaseAgent {
    constructor(provider: LLMProvider) {
        super('TaskAgent', provider);
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        return "TaskAgent handles meta-tools and does not run standalone queries.";
    }

    getTools(): Tool[] {
        return [
            {
                name: 'attempt_completion',
                description: 'Present the final result of your work to the user. Use this only when you are certain the task is complete.',
                parameters: {
                    type: 'object',
                    properties: {
                        result: {
                            type: 'string',
                            description: 'A concise summary of what was accomplished.'
                        },
                        command: {
                            type: 'string',
                            description: 'Optional command the user can run to verify the result.'
                        }
                    },
                    required: ['result']
                }
            },
            {
                name: 'ask_followup_question',
                description: 'Ask the user a clarifying question when you are blocked and cannot proceed without more information.',
                parameters: {
                    type: 'object',
                    properties: {
                        question: {
                            type: 'string',
                            description: 'The question to ask the user.'
                        }
                    },
                    required: ['question']
                }
            }
        ];
    }

    async executeTool(name: string, args: any): Promise<ToolResult> {
        if (name === 'attempt_completion') {
            return {
                success: true,
                output: `Task completion attempted with result: ${args.result}`,
                data: args
            };
        }
        if (name === 'ask_followup_question') {
            return {
                success: true,
                output: `User was asked: ${args.question}`,
                data: args
            };
        }
        throw new Error(`Unknown tool: ${name}`);
    }
}
