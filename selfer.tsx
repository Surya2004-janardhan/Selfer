import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { ThinkingCore } from './src/ThinkingCore.js';
import { App } from './src/view/App.js';
import { CommandRegistry } from './src/actions/CommandRegistry.js';
import { registerCoreActions } from './src/actions/CoreActions.js';
import { ConfigManager, SelferConfig } from './src/utils/ConfigManager.js';
import inquirer from 'inquirer';

import axios from 'axios';

const program = new Command();
const configManager = new ConfigManager();

async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 2000 });
    return response.data.models.map((m: any) => m.name);
  } catch {
    return [];
  }
}

async function runSetup(): Promise<SelferConfig> {
  process.stdout.write('\x1Bc'); 
  console.log('\n🛠️  Selfer Configuration Setup [v3.0.0]\n');
  
  // Phase 1: Provider Selection
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select your AI Provider:',
      choices: [
        { name: 'Ollama (Local Models)', value: 'ollama' },
        { name: 'Anthropic (Claude Cloud)', value: 'anthropic' },
        { name: 'OpenAI (GPT Cloud)', value: 'openai' },
        { name: 'Mock (Developer Test)', value: 'mock' }
      ]
    }
  ]);

  console.log(`\n🔍 Checking ${provider} status...`);
  let modelChoices: string[] = [];
  if (provider === 'ollama') {
    modelChoices = await getOllamaModels();
    if (modelChoices.length > 0) {
      console.log(`✅ Found ${modelChoices.length} local models.\n`);
    } else {
      console.log('⚠️  No local models found or Ollama is offline. You will need to enter the name manually.\n');
    }
  }

  const answers = await inquirer.prompt([
    {
      type: modelChoices.length > 0 ? 'list' : 'input',
      name: 'model',
      message: 'Select or enter the model name:',
      choices: modelChoices.length > 0 ? modelChoices : undefined,
      default: () => {
        if (provider === 'ollama') return 'llama3.2';
        if (provider === 'anthropic') return 'claude-3-5-sonnet-20241022';
        if (provider === 'openai') return 'gpt-4o';
        return 'mock-agent';
      }
    },
    {
      type: 'password',
      name: 'anthropicKey',
      message: 'Enter your Anthropic API Key:',
      when: () => provider === 'anthropic'
    },
    {
      type: 'password',
      name: 'openaiKey',
      message: 'Enter your OpenAI API Key:',
      when: () => provider === 'openai'
    },
    {
        type: 'input',
        name: 'ollamaEndpoint',
        message: 'Enter Ollama API Endpoint:',
        default: 'http://localhost:11434/api/chat',
        when: () => provider === 'ollama'
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Does this look correct?',
      default: true
    }
  ]) as any;

  const finalConfig: SelferConfig = { 
    provider: provider as any, 
    model: answers.model,
    anthropicKey: answers.anthropicKey,
    openaiKey: answers.openaiKey,
    ollamaEndpoint: answers.ollamaEndpoint
  };

  if (!answers.confirm) {
    return await runSetup();
  }

  await configManager.saveConfig(finalConfig);
  console.log('\n✅ Configuration saved!\n');
  return finalConfig;
}

program
  .name('selfer')
  .description('A self-improving CLI AI agent')
  .version('3.0.0');

program
  .command('setup')
  .description('Configure Selfer providers and API keys')
  .action(async () => {
    await runSetup();
  });

program
  .command('run')
  .description('Start an interactive session with Selfer')
  .option('-m, --model <type>', 'Model override')
  .action(async (options) => {
    let config = await configManager.loadConfig();
    
    if (!config) {
      config = await runSetup();
    }

    const core = new ThinkingCore({
      model: options.model || config.model,
      cwd: process.cwd()
    }, config);

    await core.initialize();
    
    const registry = new CommandRegistry();
    registerCoreActions(registry, core);

    const { waitUntilExit } = render(
      <App 
        core={core} 
        registry={registry} 
        modelName={config?.model || options.model || 'unknown'}
        providerName={config?.provider || 'ollama'}
      />
    );
    await waitUntilExit();
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
