import chalk from 'chalk';
import ora from 'ora';

export class CLIGui {
    private static spinner = ora({ color: 'cyan', spinner: 'dots' });

    static welcome() {
        console.log(chalk.blue.bold('\n----------------------------------------'));
        console.log(chalk.green.bold('       SELFER - Autonomous Agent        '));
        console.log(chalk.blue.bold('----------------------------------------\n'));
    }

    static startLoader(message: string) {
        this.spinner.text = chalk.gray(message);
        this.spinner.start();
    }

    static updateLoader(message: string) {
        this.spinner.text = chalk.gray(message);
    }

    static stopLoader() {
        this.spinner.stop();
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
        const isSpinning = this.spinner.isSpinning;
        if (isSpinning) this.spinner.stop();
        console.log(chalk.gray(`[${agentName}] ${action}`));
        if (isSpinning) this.spinner.start();
    }

    static logReasoning(reasoning: string) {
        const isSpinning = this.spinner.isSpinning;
        if (isSpinning) this.spinner.stop();
        console.log(chalk.gray(`>> ${reasoning}`));
        if (isSpinning) this.spinner.start();
    }

    static async askPermission(message: string): Promise<boolean> {
        console.log(`${chalk.yellow.bold('PERMISSION REQUIRED:')} ${message}`);
        return true;
    }
}
