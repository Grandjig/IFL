/**
 * IFL Causal Tracer
 * Builds human-readable causal chains explaining why violations occurred.
 */

import type {
  IntentDeclaration,
  CausalStep,
  ViolationType,
} from './types/index.js';

/**
 * Result of tracing a violation's cause.
 */
export interface TraceResult {
  chain: CausalStep[];
  suggestedFix: string;
  confidence: number;
}

/**
 * Safely serializes a value for display in violation reports.
 * Handles circular references, functions, Dates, BigInt, undefined, etc.
 * Truncates at 200 chars.
 */
export function safeSerialize(value: unknown, maxLength: number = 200): string {
  const seen = new WeakSet();

  function serialize(val: unknown, depth: number): string {
    if (depth > 5) {
      return '[max depth]';
    }

    if (val === undefined) {
      return '[undefined]';
    }

    if (val === null) {
      return 'null';
    }

    if (typeof val === 'function') {
      return `[Function: ${val.name || 'anonymous'}]`;
    }

    if (typeof val === 'bigint') {
      return val.toString();
    }

    if (typeof val === 'symbol') {
      return val.toString();
    }

    if (val instanceof Date) {
      return val.toISOString();
    }

    if (val instanceof RegExp) {
      return val.toString();
    }

    if (val instanceof Error) {
      return `Error: ${val.message}`;
    }

    if (Array.isArray(val)) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
      const items = val.slice(0, 10).map(v => serialize(v, depth + 1));
      if (val.length > 10) {
        items.push(`... ${val.length - 10} more`);
      }
      return `[${items.join(', ')}]`;
    }

    if (typeof val === 'object') {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
      const entries = Object.entries(val as Record<string, unknown>).slice(0, 10);
      const items = entries.map(
        ([k, v]) => `${k}: ${serialize(v, depth + 1)}`
      );
      if (Object.keys(val as object).length > 10) {
        items.push('...');
      }
      return `{ ${items.join(', ')} }`;
    }

    if (typeof val === 'string') {
      return JSON.stringify(val);
    }

    return String(val);
  }

  const result = serialize(value, 0);
  
  if (result.length > maxLength) {
    return result.slice(0, maxLength - 3) + '...';
  }
  
  return result;
}

/**
 * Checks if an array is sorted in ascending order.
 */
function isArraySorted(arr: unknown[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1];
    const curr = arr[i];
    if (typeof prev === 'number' && typeof curr === 'number') {
      if (prev > curr) return false;
    } else if (typeof prev === 'string' && typeof curr === 'string') {
      if (prev > curr) return false;
    }
  }
  return true;
}

/**
 * Builds causal chains for intent violations.
 */
export class CausalTracer {
  /**
   * Traces the cause of a violation and builds a step-by-step explanation.
   */
  trace(
    declaration: IntentDeclaration<unknown[], unknown>,
    args: unknown[],
    result: unknown,
    violationType: ViolationType
  ): TraceResult {
    const chain: CausalStep[] = [];

    // Step 1: Always show input
    chain.push({
      step: 1,
      description: `Function received input: ${safeSerialize(args)}`,
      passed: true,
      value: args,
    });

    // Step 2: Always show output
    chain.push({
      step: 2,
      description: `Function returned: ${safeSerialize(result)}`,
      passed: true,
      value: result,
    });

    // Step 3: Violation-specific step
    switch (violationType) {
      case 'precondition':
        chain.push({
          step: 3,
          description: 'Checking precondition: requires clause evaluated false',
          passed: false,
        });
        break;

      case 'postcondition':
        chain.push({
          step: 3,
          description: 'Checking postcondition: ensures clause evaluated false',
          passed: false,
        });
        break;

      case 'edge_case':
        chain.push({
          step: 3,
          description: 'Edge case matched but returned unexpected value',
          passed: false,
        });
        // Step 4 for edge_case: show expected vs actual
        this.addExpectedActualStep(chain, declaration, args, result);
        break;

      case 'exception':
        chain.push({
          step: 3,
          description: 'Function threw an exception during intent check',
          passed: false,
          value: result instanceof Error ? result.message : result,
        });
        break;
    }

    // Step 4 for postcondition: show detailed comparison
    if (violationType === 'postcondition') {
      chain.push({
        step: 4,
        description: `Input: ${safeSerialize(args)} | Output: ${safeSerialize(result)} — postcondition not satisfied`,
        passed: false,
      });
    }

    const { fix, confidence } = this.generateSuggestedFix(
      violationType,
      declaration,
      args,
      result
    );

    return { chain, suggestedFix: fix, confidence };
  }

  /**
   * Adds expected vs actual comparison step for edge case violations.
   */
  private addExpectedActualStep(
    chain: CausalStep[],
    declaration: IntentDeclaration<unknown[], unknown>,
    args: unknown[],
    result: unknown
  ): void {
    const handles = declaration.handles ?? [];
    
    for (const handler of handles) {
      try {
        if (handler.when(...args)) {
          const expected = typeof handler.returns === 'function'
            ? (handler.returns as (...a: unknown[]) => unknown)(...args)
            : handler.returns;

          chain.push({
            step: 4,
            description: `Expected: ${safeSerialize(expected)} | Actual: ${safeSerialize(result)}`,
            passed: false,
            value: { expected, actual: result },
          });
          break;
        }
      } catch {
        // Skip handlers that throw
      }
    }
  }

  /**
   * Generates a suggested fix based on the violation type and pattern matching.
   */
  generateSuggestedFix(
    violationType: ViolationType | string,
    declaration: IntentDeclaration<unknown[], unknown>,
    args: unknown[],
    result: unknown
  ): { fix: string; confidence: number } {
    const ensuresSource = declaration.ensures?.toString() ?? '';

    // Pattern 1: null/undefined result with isNonNull postcondition
    if (
      (result === null || result === undefined) &&
      (ensuresSource.includes('isNonNull') || ensuresSource.includes('!= null') || ensuresSource.includes('!== null'))
    ) {
      return {
        fix: 'Add a null guard or ensure the function always returns a value',
        confidence: 0.85,
      };
    }

    // Pattern 2: Array result with isSorted postcondition, but unsorted
    if (
      Array.isArray(result) &&
      ensuresSource.includes('isSorted') &&
      !isArraySorted(result)
    ) {
      return {
        fix: 'Verify the sort comparator returns negative/zero/positive correctly',
        confidence: 0.9,
      };
    }

    // Pattern 3: Array result with sameElements postcondition, but lengths differ
    if (
      Array.isArray(result) &&
      ensuresSource.includes('sameElements') &&
      Array.isArray(args[0]) &&
      result.length !== (args[0] as unknown[]).length
    ) {
      return {
        fix: 'The function is adding or removing elements — check for off-by-one or filtering bugs',
        confidence: 0.85,
      };
    }

    // Pattern 4: Precondition violation
    if (violationType === 'precondition') {
      return {
        fix: 'Input validation failed. Add a guard clause at the start of the function',
        confidence: 0.75,
      };
    }

    // Pattern 5: Edge case violation
    if (violationType === 'edge_case') {
      return {
        fix: 'The declared edge case is not handled correctly. Add or fix the early return for this case',
        confidence: 0.8,
      };
    }

    // Default fallback
    return {
      fix: 'Review the implementation against the declared postcondition',
      confidence: 0.5,
    };
  }
}

export const causalTracer = new CausalTracer();
