import { BaseAgent, AgentContext } from './BaseAgent';
import * as readline from 'readline';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export class CLIAgent extends BaseAgent {
    private static historyPath = path.join('.selfer', 'history.txt');
    private static history: string[] = [];

    constructor(provider: any) {
        super('CLIAgent', provider);
        CLIAgent.loadHistory();
    }

    private static loadHistory() {
        if (fs.existsSync(this.historyPath)) {
            this.history = fs.readFileSync(this.historyPath, 'utf-8').split('\n').filter(line => line.trim() !== '');
        }
    }

    private static saveToHistory(line: string) {
        if (line.trim()) {
            this.history.push(line);
            fs.appendFileSync(this.historyPath, line + '\n');
        }
    }

    async run(task: string, context: AgentContext): Promise<any> {
        const response = await this.callLLM("You are the CLI-Agent for Selfer. Assist the user with their query.", task);
        return response;
    }

    static async prompt(question: string): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            history: this.history,
            terminal: true
        });

        return new Promise((resolve) => {
            rl.question(chalk.green(`Master > `), (answer) => {
                rl.close();
                this.saveToHistory(answer);
                resolve(answer);
            });
        });
    }
}
