/**
 * IFL Runtime Monitor
 * The core engine that checks function behavior against declared intents.
 */

import * as fc from 'fast-check';
import type {
  IntentDeclaration,
  ViolationReport,
  ViolationType,
  FuzzTestOptions,
} from './types/index.js';
import { causalTracer } from './causal.tracer.js';

/**
 * Generates a UUID v4 or fallback unique ID.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 15) +
    Math.random().toString(36).slice(2, 15)
  );
}

/**
 * Gets the current stack trace.
 */
function getStackTrace(): string {
  const err = new Error();
  return err.stack ?? '';
}

/**
 * Determines the default sampling rate based on environment.
 */
function getDefaultSamplingRate(): number {
  const env = process.env['NODE_ENV'];
  if (env === 'production') {
    return 0.01; // 1% in production
  }
  return 1.0; // 100% in development/test
}

/**
 * Deep equality check for comparing expected vs actual values.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => deepEqual(val, b[idx]));
    }
    
    if (Array.isArray(a) || Array.isArray(b)) return false;
    
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    
    if (aKeys.length !== bKeys.length) return false;
    
    return aKeys.every(key => deepEqual(aObj[key], bObj[key]));
  }
  
  return false;
}

/**
 * Runtime monitor that verifies function behavior against declared intents.
 */
export class RuntimeMonitor {
  /**
   * Checks if sampling should occur based on the rate.
   * This is intentionally the simplest possible check for performance.
   */
  shouldSample(rate: number): boolean {
    return Math.random() < rate;
  }

  /**
   * Main intent checking method.
   * Returns a ViolationReport if the intent was violated, null otherwise.
   */
  checkIntent<TInput extends unknown[], TOutput>(
    _fn: (...args: TInput) => TOutput,
    declaration: IntentDeclaration<TInput, TOutput>,
    args: TInput,
    result: TOutput,
    metadata: { functionName: string; file: string }
  ): ViolationReport | null {
    // Step 1: Sampling check FIRST — zero overhead if not sampling
    const samplingRate = declaration.samplingRate ?? getDefaultSamplingRate();
    if (!this.shouldSample(samplingRate)) {
      return null;
    }

    try {
      // Step 2: Check precondition (requires)
      if (declaration.requires) {
        try {
          const preconditionMet = declaration.requires(...args);
          if (!preconditionMet) {
            return this.buildViolation(
              'precondition',
              metadata.functionName,
              metadata.file,
              args,
              result,
              declaration as any
            );
          }
        } catch (err) {
          // Precondition itself threw — treat as exception violation
          return this.buildViolation(
            'exception',
            metadata.functionName,
            metadata.file,
            args,
            err,
            declaration as any
          );
        }
      }

      // Step 3: Check edge cases (handles)
      if (declaration.handles && declaration.handles.length > 0) {
        for (const handler of declaration.handles) {
          try {
            const conditionMatched = handler.when(...args);
            if (conditionMatched) {
              // Calculate expected value
              const expected = typeof handler.returns === 'function'
                ? (handler.returns as (...a: TInput) => TOutput)(...args)
                : handler.returns;

              // Check if result matches expected
              if (!deepEqual(result, expected)) {
                return this.buildViolation(
                  'edge_case',
                  metadata.functionName,
                  metadata.file,
                  args,
                  result,
                  declaration as any,
                  expected
                );
              }
              // Edge case matched and passed — skip postcondition for this case
              return null;
            }
          } catch (err) {
            // Edge case check threw — treat as exception
            return this.buildViolation(
              'exception',
              metadata.functionName,
              metadata.file,
              args,
              err,
              declaration as any
            );
          }
        }
      }

      // Step 4: Check postcondition (ensures)
      if (declaration.ensures) {
        try {
          const postconditionMet = declaration.ensures(args, result);
          if (!postconditionMet) {
            return this.buildViolation(
              'postcondition',
              metadata.functionName,
              metadata.file,
              args,
              result,
              declaration as any
            );
          }
        } catch (err) {
          // Postcondition itself threw — this is a malformed declaration
          // Report it but note that the declaration itself is faulty
          return this.buildViolation(
            'exception',
            metadata.functionName,
            metadata.file,
            args,
            err,
            declaration as any
          );
        }
      }

      // All checks passed
      return null;
    } catch (err) {
      // Unexpected error during checking
      return this.buildViolation(
        'exception',
        metadata.functionName,
        metadata.file,
        args,
        err,
        declaration as any
      );
    }
  }

  /**
   * Runs fuzz testing on a function using fast-check.
   * Generates random inputs and checks the function against all declared intents.
   */
  async fuzzTest<TInput extends unknown[], TOutput>(
    fn: (...args: TInput) => TOutput | Promise<TOutput>,
    declaration: IntentDeclaration<TInput, TOutput>,
    options: FuzzTestOptions = {}
  ): Promise<ViolationReport[]> {
    const runs = options.runs ?? 100;
    const seed = options.seed ?? Date.now();
    const violations: ViolationReport[] = [];
    const functionName = fn.name || 'anonymous';
    const file = 'fuzz-test';

    // Check if function is async
    const isAsync = this.isAsyncFunction(fn);

    // Create property to test
    // We use a modified sampling rate of 1.0 for fuzz testing
    const testDeclaration: IntentDeclaration<TInput, TOutput> = {
      ...declaration,
      samplingRate: 1.0, // Always check during fuzz testing
    };

    // Generate array of arbitrary values with length matching fn.length
    const arity = fn.length || 1;
    const argsArbitrary = fc.array(
      fc.anything({
        maxDepth: 2,
        maxKeys: 5,
        withBigInt: false,
        withBoxedValues: false,
        withDate: true,
        withMap: false,
        withNullPrototype: false,
        withObjectString: false,
        withSet: false,
        withTypedArray: false,
      }),
      { minLength: arity, maxLength: arity }
    );

    if (isAsync) {
      // Async function testing
      const asyncProperty = fc.asyncProperty(
        argsArbitrary,
        async (args: unknown[]) => {
          // If precondition exists and fails, skip this input
          // fast-check uses fc.pre() to skip inputs
          if (declaration.requires) {
            try {
              const preconditionMet = declaration.requires(...(args as TInput));
              if (!preconditionMet) {
                // Use fast-check's precondition mechanism to skip invalid inputs
                fc.pre(false);
                return true;
              }
            } catch {
              fc.pre(false);
              return true;
            }
          }

          try {
            const result = await (fn as (...a: unknown[]) => Promise<TOutput>)(...args);
            const violation = this.checkIntent(
              fn as (...a: TInput) => TOutput,
              testDeclaration,
              args as TInput,
              result,
              { functionName, file }
            );
            if (violation) {
              violations.push(violation);
            }
            return true; // Don't fail the property, we're collecting violations
          } catch (err) {
            // Function threw — check if this violates intent
            const violation = this.buildViolation(
              'exception',
              functionName,
              file,
              args,
              err,
              testDeclaration as any
            );
            violations.push(violation);
            return true;
          }
        }
      );

      await fc.assert(asyncProperty, {
        numRuns: runs,
        seed,
        endOnFailure: false,
      }).catch(() => {
        // Ignore assertion failures — we're collecting violations
      });
    } else {
      // Sync function testing
      const syncProperty = fc.property(
        argsArbitrary,
        (args: unknown[]) => {
          // If precondition exists and fails, skip this input
          // fast-check uses fc.pre() to skip inputs
          if (declaration.requires) {
            try {
              const preconditionMet = declaration.requires(...(args as TInput));
              if (!preconditionMet) {
                // Use fast-check's precondition mechanism to skip invalid inputs
                fc.pre(false);
                return true;
              }
            } catch {
              fc.pre(false);
              return true;
            }
          }

          try {
            const result = (fn as (...a: unknown[]) => TOutput)(...args);
            const violation = this.checkIntent(
              fn as (...a: TInput) => TOutput,
              testDeclaration,
              args as TInput,
              result,
              { functionName, file }
            );
            if (violation) {
              violations.push(violation);
            }
            return true;
          } catch (err) {
            const violation = this.buildViolation(
              'exception',
              functionName,
              file,
              args,
              err,
              testDeclaration as any
            );
            violations.push(violation);
            return true;
          }
        }
      );

      fc.assert(syncProperty, {
        numRuns: runs,
        seed,
        endOnFailure: false,
      });
    }

    return violations;
  }

  /**
   * Checks if a function is async.
   */
  private isAsyncFunction(fn: Function): boolean {
    return (
      fn.constructor.name === 'AsyncFunction' ||
      fn.toString().includes('__awaiter') ||
      fn.toString().startsWith('async ')
    );
  }

  /**
   * Builds a complete ViolationReport.
   */
  private buildViolation(
    type: ViolationType,
    functionName: string,
    file: string,
    args: unknown[],
    result: unknown,
    declaration: IntentDeclaration<unknown[], unknown>,
    expected?: unknown
  ): ViolationReport {
    // Get causal trace
    const { chain, suggestedFix, confidence } = causalTracer.trace(
      declaration as any,
      args,
      result,
      type
    );

    // Build declared intent string
    const declaredIntent =
      declaration.description ??
      declaration.ensures?.toString() ??
      'No description provided';

    return {
      id: generateId(),
      timestamp: new Date(),
      functionName,
      functionFile: file,
      violationType: type,
      declaredIntent,
      input: args,
      actualOutput: result,
      expectedOutput: expected,
      causalChain: chain,
      suggestedFix,
      confidence,
      stackTrace: getStackTrace(),
    };
  }
}

export const runtimeMonitor = new RuntimeMonitor();
