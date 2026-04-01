/**
 * IFL CLI Verify Command
 * Verifies AI-generated code against an intent declaration.
 */

import { Command } from 'commander';
import { aiVerifier } from '@ifl/core';
import type { IntentDeclaration } from '@ifl/core';
import * as readline from 'node:readline';
import chalk from 'chalk';

/**
 * Reads multiline input from the terminal.
 * Ends when user presses Enter twice.
 */
async function readMultilineInput(prompt: string): Promise<string> {
  console.log(prompt);
  console.log(chalk.dim('(press Enter twice when done)'));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const lines: string[] = [];
    let emptyCount = 0;

    rl.on('line', (line) => {
      if (line === '') {
        emptyCount++;
        if (emptyCount >= 2) {
          rl.close();
          resolve(lines.join('\n'));
        }
      } else {
        emptyCount = 0;
        lines.push(line);
      }
    });
  });
}

export const verifyCommand = new Command('verify')
  .description('Verify AI-generated code against an intent declaration')
  .option('--runs <number>', 'Number of test runs', '100')
  .option('--function-name <name>', 'Name of the function to extract', 'solution')
  .action(async (options: { runs: string; functionName: string }) => {
    console.log(chalk.bold('\n=== IFL AI Code Verifier ===\n'));

    // Step 1: Read intent declaration as JSON string
    const intentJson = await readMultilineInput(
      chalk.cyan('Step 1: Paste your intent declaration as a JSON object:')
    );

    // Step 2: Parse intent declaration
    let declaration: IntentDeclaration<unknown[], unknown>;
    try {
      declaration = JSON.parse(intentJson);
    } catch {
      console.error(chalk.red('Error: Could not parse intent declaration as JSON'));
      console.log(chalk.dim('Tip: Use the programmatic API for complex intent declarations with functions'));
      process.exit(1);
    }

    // Step 3: Read code
    const code = await readMultilineInput(
      chalk.cyan('\nStep 2: Paste the AI-generated function code:')
    );

    // Step 4: Run verification
    console.log(chalk.yellow('\nVerifying...'));

    const result = await aiVerifier.verifyGeneratedCode({
      code,
      intentDeclaration: declaration,
      functionName: options.functionName,
      runs: parseInt(options.runs, 10),
    });

    // Step 5: Display result
    console.log('\n' + '\u2500'.repeat(50));

    if (result.recommendation === 'accept') {
      console.log(chalk.green.bold('\u2713 AI CODE VERIFIED'));
    } else if (result.recommendation === 'review') {
      console.log(chalk.yellow.bold('\u26A0 REVIEW RECOMMENDED'));
    } else {
      console.log(chalk.red.bold('\u2717 INTENT VIOLATIONS IN AI-GENERATED CODE'));
    }

    console.log('\u2500'.repeat(50));
    console.log(chalk.dim(`Runs: ${options.runs} | Confidence: ${Math.round(result.confidence * 100)}%`));
    console.log(`Reasoning: ${result.reasoning}`);

    if (result.staticIssues.length > 0) {
      console.log(chalk.yellow('\nStatic issues:'));
      for (const issue of result.staticIssues) {
        const icon = issue.severity === 'error' ? chalk.red('\u2717') : chalk.yellow('\u26A0');
        console.log(`  ${icon} [${issue.type}] ${issue.description}`);
      }
    }

    if (result.violations.length > 0) {
      console.log(chalk.red(`\nViolations found: ${result.violations.length}`));
      const first = result.violations[0];
      if (first) {
        console.log(chalk.dim('First violation:'));
        console.log(chalk.dim(`  Input: ${JSON.stringify(first.input)}`));
        console.log(chalk.dim(`  Output: ${JSON.stringify(first.actualOutput)}`));
        if (first.suggestedFix) {
          console.log(chalk.cyan(`  Suggested fix: ${first.suggestedFix}`));
        }
      }
    }

    console.log('\u2500'.repeat(50) + '\n');
    console.log(`Recommendation: ${
      result.recommendation === 'accept'
        ? chalk.green('ACCEPT')
        : result.recommendation === 'review'
        ? chalk.yellow('REVIEW')
        : chalk.red('REJECT')
    }`);
  });
