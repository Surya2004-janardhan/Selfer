import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CLIGui } from '../utils/CLIGui';
import { OllamaProvider } from './LLMProvider';
import { Router } from './Router';
import { MemoryStore } from './MemoryStore';

// Agent Imports
import { PlanAgent } from '../agents/PlanAgent';
import { CLIAgent } from '../agents/CLIAgent';
import { GitAgent } from '../agents/GitAgent';
import { FileAgent } from '../agents/FileAgent';
import { WebAgent } from '../agents/WebAgent';
import { CodeAgent } from '../agents/CodeAgent';
import { ReviewAgent } from '../agents/ReviewAgent';
import { EditsAgent } from '../agents/EditsAgent';
import { PermissionAgent } from '../agents/PermissionAgent';
import { TelegramAgent } from '../agents/TelegramAgent';
import { ContextAgent } from '../agents/ContextAgent';
import { SubProcessAgent } from '../agents/SubProcessAgent';
import { TrackingAgent } from '../agents/TrackingAgent';
import { ErrorRecoveryAgent } from '../agents/ErrorRecoveryAgent';
import { ErrorTrackerAgent } from '../agents/ErrorTrackerAgent';
import { BrowserAgent } from '../agents/BrowserAgent';
import { MemoryAgent } from '../agents/MemoryAgent';

export class Core {
    private static SELFER_DIR = '.selfer';

    static async init() {
        CLIGui.info('Initializing Selfer...');
        const spinner = ora('Creating .selfer directory').start();

        try {
            if (!fs.existsSync(this.SELFER_DIR)) {
                fs.mkdirSync(this.SELFER_DIR);
                spinner.succeed('.selfer directory created');
            } else {
                spinner.info('.selfer directory already exists');
            }

            const configPath = path.join(this.SELFER_DIR, 'config.json');
            if (!fs.existsSync(configPath)) {
                const defaultConfig = {
                    provider: 'ollama',
                    ollama: {
                        model: 'llama3',
                        baseUrl: 'http://localhost:11434'
                    },
                    telegram: {
                        enabled: false,
                        botToken: ''
                    },
                    master: 'Master'
                };
                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
                CLIGui.success('Default configuration created in .selfer/config.json');
            }

            const memoryPath = path.join(this.SELFER_DIR, 'memory.json');
            if (!fs.existsSync(memoryPath)) {
                fs.writeFileSync(memoryPath, JSON.stringify({ sessions: [] }, null, 2));
            }

            CLIGui.success('Selfer initialized successfully!');
            CLIGui.info('Gaining knowledge of the directory...');

        } catch (error: any) {
            spinner.fail('Initialization failed');
            CLIGui.error(error.message);
        }
    }

    static async start(options: any) {
        CLIGui.welcome();

        const configPath = path.join(this.SELFER_DIR, 'config.json');
        if (!fs.existsSync(configPath)) {
            CLIGui.error('Project not initialized. Run `selfer init` first.');
            return;
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const provider = new OllamaProvider(config.ollama);
        const router = new Router(provider);
        const memoryStore = new MemoryStore(process.cwd());

        // Register Agents
        router.registerAgent(new PlanAgent(provider));
        router.registerAgent(new CLIAgent(provider));
        router.registerAgent(new GitAgent(provider));
        router.registerAgent(new FileAgent(provider));
        router.registerAgent(new WebAgent(provider));
        router.registerAgent(new CodeAgent(provider));
        router.registerAgent(new ReviewAgent(provider));
        router.registerAgent(new EditsAgent(provider));
        router.registerAgent(new PermissionAgent(provider));
        router.registerAgent(new TelegramAgent(provider));
        router.registerAgent(new ContextAgent(provider));
        router.registerAgent(new SubProcessAgent(provider));
        router.registerAgent(new TrackingAgent(provider));
        router.registerAgent(new ErrorRecoveryAgent(provider));
        router.registerAgent(new ErrorTrackerAgent(provider));
        router.registerAgent(new BrowserAgent(provider));
        router.registerAgent(new MemoryAgent(provider));

        CLIGui.info(`Using LLM Provider: ${chalk.cyan(config.provider)}`);
        CLIGui.info('Starting chat interface...');

        const context = {
            directory: process.cwd(),
            sessionMemory: {}, // To be loaded from memoryStore
            config: config
        };

        // Main Chat Loop
        while (true) {
            const userInput = await CLIAgent.prompt('What can I help you with?');
            if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
                CLIGui.info('Exiting Selfer. Goodbye Master!');
                break;
            }

            try {
                const result = await router.routeTask(userInput, context);
                console.log(chalk.blue('\nSelfer > ') + chalk.white(result) + '\n');

                // Save session memory
                await memoryStore.saveSession({ query: userInput, response: result });
            } catch (error: any) {
                CLIGui.error(`Task execution failed: ${error.message}`);
            }
        }
    }
}
