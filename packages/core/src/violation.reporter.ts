/**
 * IFL Violation Reporter
 * Handles formatting and reporting of intent violations.
 */

import chalk from 'chalk';
import type {
  ViolationReport,
  IntentDeclaration,
} from './types/index.js';

/**
 * Error thrown when an intent violation occurs and onViolation is 'throw'.
 */
export class IntentViolationError extends Error {
  public readonly violation: ViolationReport;

  constructor(violation: ViolationReport) {
    const message = `Intent violation in ${violation.functionName}: ${violation.violationType}`;
    super(message);
    this.name = 'IntentViolationError';
    this.violation = violation;
    
    // Maintains proper stack trace in V8 environments
    const ErrorWithStack = Error as any;
    if (ErrorWithStack.captureStackTrace) {
      ErrorWithStack.captureStackTrace(this, IntentViolationError);
    }
  }
}

/**
 * Reports intent violations according to the configured handler.
 */
export class ViolationReporter {
  /**
   * Reports a violation using the specified handler.
   */
  report(
    violation: ViolationReport,
    onViolation: IntentDeclaration<unknown[], unknown>['onViolation']
  ): void {
    // Handle custom function
    if (typeof onViolation === 'function') {
      onViolation(violation);
      return;
    }

    // Handle string modes
    switch (onViolation) {
      case 'throw':
        throw new IntentViolationError(violation);

      case 'warn':
        console.warn(this.formatViolation(violation));
        break;

      case 'log':
        console.log(this.formatViolation(violation));
        break;

      default:
        // Default behavior based on NODE_ENV
        if (process.env['NODE_ENV'] === 'production') {
          console.log(this.formatViolation(violation));
        } else {
          console.warn(this.formatViolation(violation));
        }
        break;
    }
  }

  /**
   * Formats a violation report as a colorful string.
   */
  formatViolation(violation: ViolationReport): string {
    const separator = chalk.gray('━'.repeat(40));
    const lines: string[] = [];

    lines.push('');
    lines.push(separator);
    lines.push(chalk.red.bold(`INTENT VIOLATION — ${violation.functionName}`));
    lines.push(separator);
    lines.push(`${chalk.white('Type:')} ${chalk.yellow(violation.violationType)}`);
    lines.push(`${chalk.white('File:')} ${violation.functionFile}`);
    lines.push(`${chalk.white('Time:')} ${violation.timestamp.toISOString()}`);
    lines.push('');
    lines.push(`${chalk.white('Intent:')} ${chalk.dim(violation.declaredIntent)}`);
    lines.push('');
    lines.push(chalk.white('Causal trace:'));

    for (const step of violation.causalChain) {
      const mark = step.passed 
        ? chalk.green('✓') 
        : chalk.red('✗');
      lines.push(`  ${step.step}. ${step.description} ${mark}`);
    }

    lines.push('');

    if (violation.suggestedFix) {
      lines.push(`${chalk.white('Suggested fix:')} ${chalk.cyan(violation.suggestedFix)}`);
      lines.push(`${chalk.white('Confidence:')} ${Math.round(violation.confidence * 100)}%`);
    }

    lines.push(separator);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Formats a violation as plain text (no colors).
   */
  formatViolationPlain(violation: ViolationReport): string {
    const separator = '━'.repeat(40);
    const lines: string[] = [];

    lines.push('');
    lines.push(separator);
    lines.push(`INTENT VIOLATION — ${violation.functionName}`);
    lines.push(separator);
    lines.push(`Type: ${violation.violationType}`);
    lines.push(`File: ${violation.functionFile}`);
    lines.push(`Time: ${violation.timestamp.toISOString()}`);
    lines.push('');
    lines.push(`Intent: ${violation.declaredIntent}`);
    lines.push('');
    lines.push('Causal trace:');

    for (const step of violation.causalChain) {
      const mark = step.passed ? '✓' : '✗';
      lines.push(`  ${step.step}. ${step.description} ${mark}`);
    }

    lines.push('');

    if (violation.suggestedFix) {
      lines.push(`Suggested fix: ${violation.suggestedFix}`);
      lines.push(`Confidence: ${Math.round(violation.confidence * 100)}%`);
    }

    lines.push(separator);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Formats a violation as JSON.
   */
  formatViolationJson(violation: ViolationReport): string {
    return JSON.stringify(violation, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      return value;
    }, 2);
  }
}

export const violationReporter = new ViolationReporter();
