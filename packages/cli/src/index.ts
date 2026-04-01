#!/usr/bin/env node
/**
 * IFL CLI - Intent-First Layer Command Line Interface
 */

import { Command } from 'commander';
import { checkCommand } from './commands/check.js';
import { reportCommand } from './commands/report.js';
import { verifyCommand } from './commands/verify.js';

const program = new Command();

program
  .name('ifl')
  .description('Intent-First Layer CLI \u2014 verify programmer intent at runtime')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-color', 'Disable colored output');

program.addCommand(checkCommand);
program.addCommand(reportCommand);
program.addCommand(verifyCommand);

program.parse();
