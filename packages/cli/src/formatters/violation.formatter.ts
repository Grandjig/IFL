/**
 * IFL CLI Violation Formatter
 * Formats violation reports for CLI output.
 */

import chalk from 'chalk';
import type { ViolationReport } from '@ifl/core';

/**
 * Formats violations as a pretty CLI table.
 */
export function formatForCLI(violations: ViolationReport[]): string {
  if (violations.length === 0) {
    return chalk.green('\u2713 No violations found');
  }

  const lines: string[] = [];
  const separator = chalk.gray('\u2501'.repeat(80));

  lines.push('');
  lines.push(separator);
  lines.push(chalk.red.bold(`  VIOLATIONS SUMMARY: ${violations.length} found`));
  lines.push(separator);
  lines.push('');

  // Header
  lines.push(
    chalk.white.bold(
      padRight('Function', 25) +
      padRight('Type', 15) +
      padRight('Confidence', 12) +
      'Suggested Fix'
    )
  );
  lines.push(chalk.gray('\u2500'.repeat(80)));

  // Rows
  for (const v of violations) {
    const funcName = truncate(v.functionName, 23);
    const type = v.violationType;
    const confidence = `${Math.round(v.confidence * 100)}%`;
    const fix = truncate(v.suggestedFix ?? 'No suggestion', 30);

    lines.push(
      chalk.yellow(padRight(funcName, 25)) +
      chalk.cyan(padRight(type, 15)) +
      chalk.white(padRight(confidence, 12)) +
      chalk.dim(fix)
    );
  }

  lines.push('');
  lines.push(separator);

  // Detailed reports
  lines.push('');
  lines.push(chalk.white.bold('DETAILED REPORTS:'));
  lines.push('');

  for (const v of violations) {
    lines.push(formatSingleViolation(v));
  }

  return lines.join('\n');
}

/**
 * Formats a single violation report.
 */
function formatSingleViolation(violation: ViolationReport): string {
  const lines: string[] = [];
  const separator = chalk.gray('\u2500'.repeat(40));

  lines.push(separator);
  lines.push(chalk.red.bold(`INTENT VIOLATION \u2014 ${violation.functionName}`));
  lines.push(separator);
  lines.push(`${chalk.white('Type:')} ${chalk.yellow(violation.violationType)}`);
  lines.push(`${chalk.white('File:')} ${violation.functionFile}`);
  lines.push(`${chalk.white('Time:')} ${violation.timestamp.toISOString()}`);
  lines.push('');
  lines.push(`${chalk.white('Intent:')} ${chalk.dim(violation.declaredIntent)}`);
  lines.push('');
  lines.push(chalk.white('Causal trace:'));

  for (const step of violation.causalChain) {
    const mark = step.passed ? chalk.green('\u2713') : chalk.red('\u2717');
    lines.push(`  ${step.step}. ${step.description} ${mark}`);
  }

  lines.push('');

  if (violation.suggestedFix) {
    lines.push(`${chalk.white('Suggested fix:')} ${chalk.cyan(violation.suggestedFix)}`);
    lines.push(`${chalk.white('Confidence:')} ${Math.round(violation.confidence * 100)}%`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Formats violations as JSON.
 */
export function formatJSON(violations: ViolationReport[]): string {
  return JSON.stringify(
    violations,
    (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      return value;
    },
    2
  );
}

/**
 * Pads a string to a fixed width.
 */
function padRight(str: string, width: number): string {
  if (str.length >= width) {
    return str.slice(0, width);
  }
  return str + ' '.repeat(width - str.length);
}

/**
 * Truncates a string if it exceeds max length.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}
