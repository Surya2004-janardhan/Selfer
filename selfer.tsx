import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { ThinkingCore } from './src/ThinkingCore.js';
import { App } from './src/view/App.js';
import { CommandRegistry } from './src/actions/CommandRegistry.js';
import { registerCoreActions } from './src/actions/CoreActions.js';
import { ConfigManager, SelferConfig } from './src/utils/ConfigManager.js';
import inquirer from 'inquirer';

const program = new Command();
const configManager = new ConfigManager();

async function runSetup(): Promise<SelferConfig> {
  process.stdout.write('\x1Bc'); 
  console.log('\n🛠️  Selfer Configuration Setup [v2.1.0]\n');
  console.log('Available Providers:');
  console.log('- ollama: Local models (llama3.2, qwen2.5, codegemma)');
  console.log('- anthropic: Claude cloud models (claude-3-5-sonnet-20241022)');
  console.log('- openai: GPT cloud models (gpt-4o, gpt-4-turbo)');
  console.log('- mock: Deterministic testing for dev\n');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select your AI Provider:',
      choices: ['ollama', 'anthropic', 'openai', 'mock']
    },
    {
      type: 'input',
      name: 'model',
      message: 'Enter the model name:',
      default: (ans: any) => {
        if (ans.provider === 'ollama') return 'llama3.2';
        if (ans.provider === 'anthropic') return 'claude-3-5-sonnet-20241022';
        if (ans.provider === 'openai') return 'gpt-4o';
        return 'mock-agent';
      }
    },
    {
      type: 'password',
      name: 'anthropicKey',
      message: 'Enter your Anthropic API Key:',
      when: (ans: any) => ans.provider === 'anthropic'
    },
    {
      type: 'password',
      name: 'openaiKey',
      message: 'Enter your OpenAI API Key:',
      when: (ans: any) => ans.provider === 'openai'
    },
    {
        type: 'input',
        name: 'ollamaEndpoint',
        message: 'Enter Ollama API Endpoint:',
        default: 'http://localhost:11434/api/chat',
        when: (ans: any) => ans.provider === 'ollama'
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Does this look correct?',
      default: true
    }
  ]) as SelferConfig & { confirm: boolean };

  if (!answers.confirm) {
    return await runSetup();
  }

  await configManager.saveConfig(answers);
  console.log('\n✅ Configuration saved!\n');
  return answers;
}

program
  .name('selfer')
  .description('A self-improving CLI AI agent')
  .version('2.1.0');

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
