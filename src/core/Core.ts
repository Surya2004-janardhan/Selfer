import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CLIGui } from '../utils/CLIGui';
import { Logger } from '../utils/Logger';
import {
    OllamaProvider,
    OpenAIProvider,
    GeminiProvider,
    ClaudeProvider,
    FallbackLLMProvider,
    LLMProvider
} from './LLMProvider';
import { Router } from './Router';
import { MemoryStore } from './MemoryStore';
import { CLIAgent } from '../agents/CLIAgent';

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
                    openai: { apiKey: '', model: 'gpt-4o' },
                    gemini: { apiKey: '', model: 'gemini-1.5-pro' },
                    claude: { apiKey: '', model: 'claude-3-5-sonnet-20241022' },
                    ollama: { model: 'llama3:8b', baseUrl: 'http://localhost:11434' },
                    telegram: { enabled: false, botToken: '' },
                    master: 'Master'
                };
                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
                CLIGui.success('Default configuration created in .selfer/config.json');
            }

            const memoryPath = path.join(this.SELFER_DIR, 'memory.json');
            if (!fs.existsSync(memoryPath)) {
                fs.writeFileSync(memoryPath, JSON.stringify({ sessions: [] }, null, 2));
            }

            // Create logs directory
            const logsPath = path.join(this.SELFER_DIR, 'logs');
            if (!fs.existsSync(logsPath)) {
                fs.mkdirSync(logsPath, { recursive: true });
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

        // Set log directory from config or default
        process.env.LOG_DIR = process.env.LOG_DIR || path.join(this.SELFER_DIR, 'logs');

        const providersList: { name: string; provider: LLMProvider }[] = [];
        let activeModelName = 'gpt-4o';

        if (config.openai?.apiKey) {
            providersList.push({ name: 'OpenAI', provider: new OpenAIProvider(config.openai) });
            activeModelName = config.openai.model || 'gpt-4o';
        }
        if (config.gemini?.apiKey) {
            providersList.push({ name: 'Gemini', provider: new GeminiProvider(config.gemini) });
            if (providersList.length === 1) activeModelName = config.gemini.model || 'gemini-1.5-pro';
        }
        if (config.claude?.apiKey) {
            providersList.push({ name: 'Claude', provider: new ClaudeProvider(config.claude) });
            if (providersList.length === 1) activeModelName = config.claude.model || 'claude-3-5-sonnet-20241022';
        }
        if (config.ollama?.model) {
            providersList.push({ name: 'Ollama', provider: new OllamaProvider(config.ollama) });
            if (providersList.length === 1) activeModelName = config.ollama.model || 'llama3:8b';
        }

        if (providersList.length === 0) {
            CLIGui.error('No LLM providers configured. Please check .selfer/config.json');
            return;
        }

        // Register graceful shutdown handler
        let isShuttingDown = false;
        const shutdown = () => {
            if (isShuttingDown) return;
            isShuttingDown = true;
            CLIGui.stopLoader();
            CLIGui.info('\nExiting Selfer. Goodbye!');
            Logger.info('Selfer session ended');
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        try {
            const mainProvider = new FallbackLLMProvider(providersList);
            const router = new Router(mainProvider, activeModelName);
            await router.init();

            const memoryStore = new MemoryStore(process.cwd());

            CLIGui.info(`Configured Providers: ${chalk.cyan(providersList.map(p => p.name).join(', '))}`);
            CLIGui.info(`Active Model: ${chalk.cyan(activeModelName)}`);
            CLIGui.info('Starting chat interface...\n');
            Logger.info('Selfer session started', { providers: providersList.map(p => p.name), model: activeModelName });

            const context = {
                directory: process.cwd(),
                sessionMemory: {},
                config: config
            };

            // Main Chat Loop
            while (!isShuttingDown) {
                const userInput = await CLIAgent.prompt('What can I help you with?');
                if (!userInput || userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
                    shutdown();
                    break;
                }

                try {
                    const result = await router.routeTask(userInput, context);
                    console.log(chalk.blue('\nSelfer > ') + chalk.white(result) + '\n');

                    // Save session memory
                    await memoryStore.saveSession({ query: userInput, response: result });

                    // Consolidate memory when enough sessions accumulate
                    const memoryPath = path.join(this.SELFER_DIR, 'memory.json');
                    if (fs.existsSync(memoryPath)) {
                        const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
                        if (memory.sessions.length >= 5) {
                            CLIGui.info('Consolidating memory...');
                            await memoryStore.updateContext(mainProvider);
                        }
                    }
                } catch (error: any) {
                    CLIGui.error(`Task execution failed: ${error.message}`);
                    Logger.error('Task execution failed', { error: error.message });
                }
            }
        } catch (error: any) {
            CLIGui.error(`Critical failure in start loop: ${error.message}`);
            Logger.error('Critical failure', { error: error.message });
            process.exit(1);
        }
    }
}
