#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { Core } from './core/Core';

const program = new Command();

program
    .name('selfer')
    .description('Local first autonomous agent framework')
    .version('1.0.0');

program
    .command('init')
    .description('Initialize a new .selfer project in the current directory')
    .action(async () => {
        await Core.init();
    });

program
    .command('start')
    .description('Start the selfer agent session')
    .option('-t, --telegram', 'Enable telegram integration')
    .action(async (options) => {
        await Core.start(options);
    });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
