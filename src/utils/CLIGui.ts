import chalk from 'chalk';
import ora from 'ora';

export class CLIGui {
    static welcome() {
        console.log(chalk.blue.bold('\n----------------------------------------'));
        console.log(chalk.green.bold('       SELFER - Autonomous Agent        '));
        console.log(chalk.blue.bold('----------------------------------------\n'));
    }

    static info(message: string) {
        console.log(`${chalk.blue('ℹ')} ${message}`);
    }

    static success(message: string) {
        console.log(`${chalk.green('✔')} ${message}`);
    }

    static error(message: string) {
        console.log(`${chalk.red('✖')} ${chalk.red.bold('Error:')} ${message}`);
    }

    static warning(message: string) {
        console.log(`${chalk.yellow('⚠')} ${message}`);
    }

    static logAgentAction(agentName: string, action: string) {
        console.log(`${chalk.cyan(`[${agentName}]`)} ${chalk.white(action)}`);
    }

    static logReasoning(reasoning: string) {
        console.log(`${chalk.gray('>>')} ${chalk.italic(reasoning)}`);
    }

    static async askPermission(message: string): Promise<boolean> {
        // This would typically use inquirer, but for skeleton:
        console.log(`${chalk.yellow.bold('PERMISSION REQUIRED:')} ${message}`);
        return true; // Auto-approved for now as per user instruction "DONT ASK FOR ANY PERMISSION"
    }
}
