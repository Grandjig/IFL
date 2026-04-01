/**
 * IFL CLI Check Command
 * Runs fuzz testing on all registered intents in a file.
 */

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { intentRegistry, runtimeMonitor } from '@ifl/core';
import type { ViolationReport } from '@ifl/core';
import { formatForCLI, formatJSON } from '../formatters/violation.formatter.js';

export const checkCommand = new Command('check')
  .description('Run fuzz testing on all @intent declarations in a file')
  .argument('<file>', 'TypeScript/JavaScript file to check')
  .option('-r, --runs <number>', 'Number of fuzz test iterations', '100')
  .option('-t, --tags <tags>', 'Comma-separated tags to filter intents')
  .option('-f, --format <format>', 'Output format: pretty or json', 'pretty')
  .action(async (file: string, options: { runs: string; tags?: string; format: string }) => {
    const runs = parseInt(options.runs, 10);
    const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];
    const format = options.format as 'pretty' | 'json';

    try {
      // Clear any previously registered intents
      intentRegistry.clear();

      // Resolve and import the target file
      const absolutePath = path.resolve(process.cwd(), file);
      
      console.log(chalk.dim(`\nLoading ${file}...`));
      
      // Dynamic import triggers all @intent decorators to register
      await import(absolutePath);

      // Get all registered intents
      let intents = intentRegistry.getAll();

      // Filter by tags if provided
      if (tags.length > 0) {
        intents = intentRegistry.getByTags(tags);
        console.log(chalk.dim(`Filtered to ${intents.size} intents with tags: ${tags.join(', ')}`));
      }

      if (intents.size === 0) {
        console.log(chalk.yellow('\n⚠ No @intent declarations found in the file.'));
        console.log(chalk.dim('Make sure functions are decorated with @intent or wrapped with intent().'));
        return;
      }

      console.log(chalk.dim(`Found ${intents.size} intent declarations. Running ${runs} fuzz tests each...\n`));

      // Collect all violations
      const allViolations: ViolationReport[] = [];
      const results: Array<{ name: string; violations: number }> = [];

      for (const [name, registration] of intents) {
        process.stdout.write(chalk.dim(`  Testing ${name}... `));

        try {
          // Get the wrapped function from the registration
          const wrappedFn = registration.wrappedFunction ?? registration.originalFunction;
          
          if (typeof wrappedFn !== 'function') {
            console.log(chalk.yellow('skipped (no function reference)'));
            continue;
          }

          // Run fuzz testing
          const violations = await runtimeMonitor.fuzzTest(
            wrappedFn as (...args: unknown[]) => unknown,
            registration.declaration,
            { runs }
          );

          allViolations.push(...violations);
          results.push({ name, violations: violations.length });

          if (violations.length === 0) {
            console.log(chalk.green('✓ passed'));
          } else {
            console.log(chalk.red(`✗ ${violations.length} violations`));
          }
        } catch (err) {
          console.log(chalk.red(`error: ${err instanceof Error ? err.message : String(err)}`));
        }
      }

      // Output results
      console.log('');

      if (format === 'json') {
        console.log(formatJSON(allViolations));
      } else {
        if (allViolations.length === 0) {
          console.log(chalk.green.bold(
            `✓ Checked ${intents.size} intent declarations — ${runs} runs each — 0 violations`
          ));
        } else {
          console.log(formatForCLI(allViolations));
          console.log(chalk.red.bold(
            `✗ ${allViolations.length} violations found across ${results.filter(r => r.violations > 0).length} functions`
          ));
        }
      }

    } catch (err) {
      console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : String(err)}`));
      if (err instanceof Error && err.stack) {
        console.error(chalk.dim(err.stack));
      }
      process.exit(1);
    }
  });
