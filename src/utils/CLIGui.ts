import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';

export class CLIGui {
    private static spinner = ora({ color: 'cyan', spinner: 'dots' });
    private static streamBuffer = '';

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

    // ── Streaming output ─────────────────────────────────────────────────────

    /** Start a new streaming response section */
    static startStream() {
        this.stopLoader();
        this.streamBuffer = '';
        process.stdout.write(chalk.cyan('\nAssistant: '));
    }

    /** Write a chunk to the streaming output */
    static writeStreamChunk(chunk: string) {
        this.streamBuffer += chunk;
        process.stdout.write(chunk);
    }

    /** End the streaming response */
    static endStream() {
        process.stdout.write('\n\n');
        return this.streamBuffer;
    }

    // ── User approval ────────────────────────────────────────────────────────

    /**
     * Prompt the user for permission to perform a destructive action.
     * Returns true if approved, false if denied.
     */
    static async askPermission(message: string): Promise<boolean> {
        this.stopLoader();
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            console.log('');
            console.log(chalk.yellow.bold('⚠ PERMISSION REQUIRED'));
            console.log(chalk.white(message));
            rl.question(chalk.cyan('Allow this action? [y/N]: '), (answer) => {
                rl.close();
                const approved = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
                if (approved) {
                    this.success('Action approved');
                } else {
                    this.warning('Action denied by user');
                }
                resolve(approved);
            });
        });
    }

    /** Display token usage information */
    static showTokenUsage(promptTokens: number, completionTokens: number, totalTokens: number) {
        console.log(chalk.gray(`  Tokens: ${promptTokens} in / ${completionTokens} out / ${totalTokens} total`));
    }
}
