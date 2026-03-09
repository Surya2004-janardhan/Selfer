import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CLIGui } from '../utils/CLIGui';
import { OllamaProvider, OpenAIProvider, GeminiProvider, ClaudeProvider, FallbackLLMProvider, LLMProvider } from './LLMProvider';
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
                    openai: { apiKey: '', model: 'gpt-4o' },
                    gemini: { apiKey: '', model: 'gemini-1.5-pro' },
                    claude: { apiKey: '', model: 'claude-3-5-sonnet-20240620' },
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

        const providersList: { name: string; provider: LLMProvider }[] = [];

        if (config.openai?.apiKey) {
            providersList.push({ name: 'OpenAI', provider: new OpenAIProvider(config.openai) });
        }
        if (config.gemini?.apiKey) {
            providersList.push({ name: 'Gemini', provider: new GeminiProvider(config.gemini) });
        }
        if (config.claude?.apiKey) {
            providersList.push({ name: 'Claude', provider: new ClaudeProvider(config.claude) });
        }
        if (config.ollama?.model) {
            providersList.push({ name: 'Ollama', provider: new OllamaProvider(config.ollama) });
        }

        if (providersList.length === 0) {
            CLIGui.error('No LLM providers configured. Please check .selfer/config.json');
            return;
        }

        const mainProvider = new FallbackLLMProvider(providersList);
        const router = new Router(mainProvider);
        const memoryStore = new MemoryStore(process.cwd());

        // Register Agents with the fallback provider
        router.registerAgent(new PlanAgent(mainProvider));
        router.registerAgent(new CLIAgent(mainProvider));
        router.registerAgent(new GitAgent(mainProvider));

        // ... (rest of registration)
        router.registerAgent(new FileAgent(mainProvider));
        router.registerAgent(new WebAgent(mainProvider));
        router.registerAgent(new CodeAgent(mainProvider));
        router.registerAgent(new ReviewAgent(mainProvider));
        router.registerAgent(new EditsAgent(mainProvider));
        router.registerAgent(new PermissionAgent(mainProvider));
        router.registerAgent(new TelegramAgent(mainProvider));
        router.registerAgent(new ContextAgent(mainProvider));
        router.registerAgent(new SubProcessAgent(mainProvider));
        router.registerAgent(new TrackingAgent(mainProvider));
        router.registerAgent(new ErrorRecoveryAgent(mainProvider));
        router.registerAgent(new ErrorTrackerAgent(mainProvider));
        router.registerAgent(new BrowserAgent(mainProvider));
        router.registerAgent(new MemoryAgent(mainProvider));

        CLIGui.info(`Configured Providers: ${chalk.cyan(providersList.map(p => p.name).join(', '))}`);
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
