import { BaseAgent, AgentContext } from './BaseAgent';
import * as readline from 'readline';
import chalk from 'chalk';

export class CLIAgent extends BaseAgent {
    constructor(provider: any) {
        super('CLIAgent', provider);
    }

    async run(task: string, context: AgentContext): Promise<any> {
        // This agent handles the chat interface and user interaction
        const response = await this.callLLM("You are the CLI-Agent for Selfer. Assist the user with their query.", task);
        return response;
    }

    static async prompt(question: string): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(chalk.green(`Master > `), (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }
}
