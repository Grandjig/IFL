/**
 * IFL CLI Report Command
 * Generates reports from violation log files.
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import type { ViolationReport } from '@ifl/core';

export const reportCommand = new Command('report')
  .description('Generate a report from a violations log file')
  .argument('<file>', 'JSON violations log file')
  .option('-f, --format <format>', 'Output format: summary or detailed', 'summary')
  .action(async (file: string, options: { format: string }) => {
    try {
      const absolutePath = path.resolve(process.cwd(), file);
      
      if (!fs.existsSync(absolutePath)) {
        console.error(chalk.red(`Error: File not found: ${file}`));
        process.exit(1);
      }

      const content = fs.readFileSync(absolutePath, 'utf-8');
      const violations: ViolationReport[] = JSON.parse(content);

      if (!Array.isArray(violations)) {
        console.error(chalk.red('Error: Invalid log file format. Expected an array of violations.'));
        process.exit(1);
      }

      generateReport(violations, options.format as 'summary' | 'detailed');

    } catch (err) {
      console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

function generateReport(violations: ViolationReport[], format: 'summary' | 'detailed'): void {
  const separator = chalk.gray('━'.repeat(60));

  console.log('');
  console.log(separator);
  console.log(chalk.white.bold('  IFL VIOLATION REPORT'));
  console.log(separator);
  console.log('');

  // Total violations
  console.log(chalk.white(`Total violations: ${chalk.yellow(violations.length.toString())}}`));
  console.log('');

  // Violations by function
  const byFunction = new Map<string, number>();
  for (const v of violations) {
    byFunction.set(v.functionName, (byFunction.get(v.functionName) ?? 0) + 1);
  }

  console.log(chalk.white.bold('Violations by function:'));
  const sortedFunctions = Array.from(byFunction.entries()).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sortedFunctions) {
    const bar = chalk.red('█'.repeat(Math.min(count, 30)));
    console.log(`  ${chalk.yellow(name.padEnd(30))} ${bar} ${count}`);
  }
  console.log('');

  // Violations by type
  const byType = new Map<string, number>();
  for (const v of violations) {
    byType.set(v.violationType, (byType.get(v.violationType) ?? 0) + 1);
  }

  console.log(chalk.white.bold('Violations by type:'));
  for (const [type, count] of byType.entries()) {
    console.log(`  ${chalk.cyan(type.padEnd(20))} ${count}`);
  }
  console.log('');

  // Timeline
  if (violations.length > 0) {
    console.log(chalk.white.bold('Timeline:'));
    const sorted = [...violations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const first = new Date(sorted[0]!.timestamp);
    const last = new Date(sorted[sorted.length - 1]!.timestamp);
    console.log(`  First: ${chalk.dim(first.toISOString())}`);
    console.log(`  Last:  ${chalk.dim(last.toISOString())}`);
    console.log('');
  }

  // Detailed violations if requested
  if (format === 'detailed') {
    console.log(chalk.white.bold('Detailed violations:'));
    console.log('');
    for (const v of violations) {
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.red(`${v.functionName} — ${v.violationType}`));
      console.log(chalk.dim(`File: ${v.functionFile}`));
      console.log(chalk.dim(`Time: ${v.timestamp}`));
      console.log(`Intent: ${v.declaredIntent}`);
      if (v.suggestedFix) {
        console.log(chalk.cyan(`Fix: ${v.suggestedFix}`));
      }
      console.log('');
    }
  }

  console.log(separator);
  console.log('');
}
