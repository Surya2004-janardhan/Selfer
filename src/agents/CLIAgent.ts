import { BaseAgent, AgentContext } from './BaseAgent';
import { LLMMessage } from '../core/LLMProvider';
import * as readline from 'readline';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export class CLIAgent extends BaseAgent {
    private static historyPath = path.join('.selfer', 'history.txt');
    private static rl: readline.Interface | null = null;

    constructor(provider: any) {
        super('CLIAgent', provider);
        CLIAgent.initRL();
    }

    private static initRL() {
        if (this.rl) return;

        let history: string[] = [];
        if (fs.existsSync(this.historyPath)) {
            history = fs.readFileSync(this.historyPath, 'utf-8').split('\n').filter(line => line.trim() !== '');
        }

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            historySize: 100,
            terminal: true,
            history: history.reverse() // Readline takes history from newest to oldest for up arrow
        });

        // Handle line events to manually save history to file
        this.rl.on('line', (line) => {
            if (line.trim()) {
                fs.appendFileSync(this.historyPath, line + '\n');
            }
        });
    }

    async run(messages: LLMMessage[], context: AgentContext): Promise<any> {
        const task = messages[messages.length - 1].content;
        const response = await this.provider.generateResponse([
            { role: 'system', content: "You are the CLI-Agent for Selfer. Assist the user friendly." },
            ...messages
        ]);
        return response.content;
    }

    static async prompt(question: string): Promise<string> {
        this.initRL();
        return new Promise((resolve) => {
            this.rl!.question(chalk.green(`Master > `), (answer) => {
                resolve(answer);
            });
        });
    }

    static close() {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
    }
}
