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
        { name: 'Gemini (Google AI)', value: 'gemini' },
        { name: 'Anthropic (Claude Cloud)', value: 'anthropic' },
        { name: 'OpenAI (GPT Cloud)', value: 'openai' },
        { name: 'Mock (Developer Test)', value: 'mock' }
      ]
    }
  ]);

  console.log(`\n🔍 Fetching available models for ${provider}...`);
  let modelChoices: string[] = [];
  
  if (provider === 'ollama') {
    modelChoices = await getOllamaModels();
    if (modelChoices.length > 0) {
      console.log(`✅ Found ${modelChoices.length} local models.\n`);
    } else {
      console.log('⚠️  No local models found. You will need to enter one manually.\n');
    }
  } else if (provider === 'anthropic') {
    modelChoices = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229'
    ];
  } else if (provider === 'gemini') {
    modelChoices = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp'
    ];
  } else if (provider === 'openai') {
    modelChoices = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ];
  } else if (provider === 'mock') {
    modelChoices = ['mock-agent'];
  }

  const answers = await inquirer.prompt([
    {
      type: modelChoices.length > 0 ? 'list' : 'input',
      name: 'model',
      message: 'Select or enter the model name:',
      choices: modelChoices.length > 0 ? modelChoices : undefined,
      default: () => {
        if (provider === 'ollama') return '';
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
        type: 'password',
        name: 'geminiKey',
        message: 'Enter your Gemini API Key:',
        when: () => provider === 'gemini'
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
    geminiKey: answers.geminiKey,
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
