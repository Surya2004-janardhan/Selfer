import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import chalk from 'chalk';
import { ThinkingCore } from './src/ThinkingCore.js';
import { App } from './src/view/App.js';

const program = new Command();

program
  .name('selfer')
  .description('A self-improving CLI AI agent')
  .version('1.0.0');

program
  .command('run')
  .description('Start an interactive session with Selfer')
  .option('-m, --model <type>', 'Model to use (ollama, anthropic, openai)', 'ollama')
  .action(async (options) => {
    // Phase 3: Final TUI Integration
    const core = new ThinkingCore({
      model: options.model,
      cwd: process.cwd()
    });

    await core.initialize();
    
    // Clear console for premium Linux terminal experience
    process.stdout.write('\x1Bc'); 
    
    const { waitUntilExit } = render(<App core={core} />);
    await waitUntilExit();
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
