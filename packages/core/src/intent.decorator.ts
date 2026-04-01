/**
 * IFL Intent Decorator
 * The primary developer-facing API for declaring function intents.
 */

import 'reflect-metadata';
import type {
  IntentDeclaration,
  IntentMetadata,
  INTENT_METADATA_KEY,
  ViolationReport,
} from './types/index.js';
import { intentRegistry } from './intent.registry.js';
import { runtimeMonitor } from './runtime.monitor.js';

// Symbol for storing intent metadata
const INTENT_KEY: typeof INTENT_METADATA_KEY = Symbol('ifl:intent') as typeof INTENT_METADATA_KEY;

/**
 * Extracts the file path from an Error stack trace.
 */
function extractFileFromStack(): string {
  const err = new Error();
  const stack = err.stack ?? '';
  const lines = stack.split('\n');
  
  // Skip first few lines (Error message, this function, intent function, decorator)
  // Look for the first line that's not from this module
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Skip internal node modules and this package
    if (line.includes('node_modules') || line.includes('intent.decorator')) {
      continue;
    }
    
    // Extract file path from stack line
    // Formats: "at path/to/file.ts:line:col" or "at Function (path/to/file.ts:line:col)"
    const match = line.match(/(?:at\s+(?:.+\s+)?\(?)?([^()\s]+):\d+:\d+\)?/);
    if (match?.[1]) {
      return match[1];
    }
  }
  
  return 'unknown';
}

/**
 * Checks if a value is a Promise.
 */
function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'then' in value &&
    typeof (value as { then: unknown }).then === 'function'
  );
}

/**
 * Default violation handler based on environment.
 */
function getDefaultViolationHandler(): 'warn' | 'log' {
  return process.env['NODE_ENV'] === 'production' ? 'log' : 'warn';
}

/**
 * Handles a violation based on the declaration's onViolation setting.
 */
function handleViolation(
  violation: ViolationReport,
  onViolation: IntentDeclaration<unknown[], unknown>['onViolation']
): void {
  const handler = onViolation ?? getDefaultViolationHandler();

  if (typeof handler === 'function') {
    handler(violation);
    return;
  }

  const message = formatViolationMessage(violation);

  switch (handler) {
    case 'throw':
      const error = new Error(message);
      (error as Error & { violation: ViolationReport }).violation = violation;
      error.name = 'IntentViolationError';
      throw error;

    case 'warn':
      console.warn(message);
      break;

    case 'log':
    default:
      console.log(message);
      break;
  }
}

/**
 * Formats a violation report as a string message.
 */
function formatViolationMessage(violation: ViolationReport): string {
  const lines = [
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `INTENT VIOLATION — ${violation.functionName}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `Type: ${violation.violationType}`,
    `File: ${violation.functionFile}`,
    `Time: ${violation.timestamp.toISOString()}`,
    '',
    `Declared intent: ${violation.declaredIntent}`,
    '',
    'Causal trace:',
  ];

  for (const step of violation.causalChain) {
    const mark = step.passed ? '✓' : '✗';
    lines.push(`  ${step.step}. ${step.description} ${mark}`);
  }

  lines.push('');
  
  if (violation.suggestedFix) {
    lines.push(`Suggested fix: ${violation.suggestedFix}`);
    lines.push(`Confidence: ${Math.round(violation.confidence * 100)}%`);
  }
  
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  return lines.join('\n');
}

/**
 * Creates a wrapped function that monitors intent compliance.
 */
function createWrappedFunction<TInput extends unknown[], TOutput>(
  originalFn: (...args: TInput) => TOutput,
  declaration: IntentDeclaration<TInput, TOutput>,
  functionName: string,
  file: string
): (...args: TInput) => TOutput {
  // Create wrapper that handles both sync and async
  const wrapper = function (this: unknown, ...args: TInput): TOutput {
    let result: TOutput;
    
    try {
      result = originalFn.apply(this, args);
    } catch (err) {
      // Function threw — check if this violates intent
      const violation = runtimeMonitor.checkIntent(
        originalFn,
        declaration as IntentDeclaration<unknown[], unknown>,
        args,
        err as TOutput,
        { functionName, file }
      );
      
      if (violation) {
        intentRegistry.incrementViolationCount(functionName, violation);
        handleViolation(violation, declaration.onViolation);
      }
      
      throw err;
    }

    // Check if result is a Promise
    if (isPromise<TOutput>(result)) {
      // Return a new Promise that checks intent after resolution
      return result.then(
        (resolvedResult) => {
          const violation = runtimeMonitor.checkIntent(
            originalFn,
            declaration as IntentDeclaration<unknown[], unknown>,
            args,
            resolvedResult,
            { functionName, file }
          );

          if (violation) {
            intentRegistry.incrementViolationCount(functionName, violation);
            handleViolation(violation, declaration.onViolation);
          }

          return resolvedResult;
        },
        (err) => {
          // Promise rejected — check if this violates intent
          const violation = runtimeMonitor.checkIntent(
            originalFn,
            declaration as IntentDeclaration<unknown[], unknown>,
            args,
            err as TOutput,
            { functionName, file }
          );

          if (violation) {
            intentRegistry.incrementViolationCount(functionName, violation);
            handleViolation(violation, declaration.onViolation);
          }

          throw err;
        }
      ) as TOutput;
    }

    // Sync result — check intent immediately
    const violation = runtimeMonitor.checkIntent(
      originalFn,
      declaration as IntentDeclaration<unknown[], unknown>,
      args,
      result,
      { functionName, file }
    );

    if (violation) {
      intentRegistry.incrementViolationCount(functionName, violation);
      handleViolation(violation, declaration.onViolation);
    }

    return result;
  };

  // Preserve function properties
  Object.defineProperty(wrapper, 'name', {
    value: functionName,
    configurable: true,
  });

  Object.defineProperty(wrapper, 'length', {
    value: originalFn.length,
    configurable: true,
  });

  // Store original toString
  const originalToString = originalFn.toString.bind(originalFn);
  wrapper.toString = () => originalToString();

  // Store intent metadata
  const metadata: IntentMetadata<TInput, TOutput> = {
    declaration,
    file,
    functionName,
    isAsync: originalFn.constructor.name === 'AsyncFunction',
    registeredAt: new Date(),
  };

  Reflect.defineMetadata(INTENT_KEY, metadata, wrapper);

  return wrapper as (...args: TInput) => TOutput;
}

/**
 * The @intent decorator factory.
 * 
 * Works as both:
 * 1. A method decorator: @intent({ ensures: ... })
 * 2. A function wrapper: const fn = intent({ ensures: ... })(originalFn)
 * 
 * @example Method decorator usage:
 * ```typescript
 * class Calculator {
 *   @intent({
 *     ensures: (input, output) => output >= 0,
 *     description: 'Returns the absolute value'
 *   })
 *   abs(n: number): number {
 *     return Math.abs(n);
 *   }
 * }
 * ```
 * 
 * @example Function wrapper usage:
 * ```typescript
 * const safeSort = intent({
 *   ensures: (input, output) => isSorted(output),
 *   description: 'Sorts an array'
 * })((arr: number[]) => arr.sort((a, b) => a - b));
 * ```
 */
export function intent<TInput extends unknown[], TOutput>(
  declaration: IntentDeclaration<TInput, TOutput>
): {
  // Method decorator signature
  <T>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: TInput) => TOutput>
  ): TypedPropertyDescriptor<(...args: TInput) => TOutput> | void;

  // Function wrapper signature  
  (fn: (...args: TInput) => TOutput): (...args: TInput) => TOutput;
} {
  const file = extractFileFromStack();

  // Return a function that can act as both decorator and wrapper
  return function intentDecorator(
    targetOrFn: object | ((...args: TInput) => TOutput),
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<(...args: TInput) => TOutput>
  ):
    | TypedPropertyDescriptor<(...args: TInput) => TOutput>
    | ((...args: TInput) => TOutput)
    | void {
    // Case 1: Used as function wrapper — intent({ ... })(fn)
    if (typeof targetOrFn === 'function' && propertyKey === undefined) {
      const originalFn = targetOrFn as (...args: TInput) => TOutput;
      const functionName = originalFn.name || 'anonymous';

      // Register with the registry
      intentRegistry.register(
        functionName,
        file,
        declaration as IntentDeclaration<unknown[], unknown>
      );

      // Return wrapped function
      return createWrappedFunction(originalFn, declaration, functionName, file);
    }

    // Case 2: Used as method decorator — @intent({ ... })
    if (
      descriptor !== undefined &&
      propertyKey !== undefined &&
      typeof descriptor.value === 'function'
    ) {
      const originalMethod = descriptor.value;
      const functionName = String(propertyKey);

      // Register with the registry
      intentRegistry.register(
        functionName,
        file,
        declaration as IntentDeclaration<unknown[], unknown>
      );

      // Replace with wrapped method
      descriptor.value = createWrappedFunction(
        originalMethod,
        declaration,
        functionName,
        file
      ) as typeof descriptor.value;

      return descriptor;
    }

    // Case 3: Used as legacy decorator on a class field (stage 2 decorators)
    // This handles: @intent({ ... }) methodName = () => { ... }
    if (propertyKey !== undefined && descriptor === undefined) {
      const functionName = String(propertyKey);

      // Register placeholder — will be fully registered when field is assigned
      intentRegistry.register(
        functionName,
        file,
        declaration as IntentDeclaration<unknown[], unknown>
      );

      // Return a property descriptor that wraps on first access
      return {
        configurable: true,
        enumerable: false,
        get(this: object) {
          return undefined;
        },
        set(this: object, originalFn: (...args: TInput) => TOutput) {
          const wrapped = createWrappedFunction(
            originalFn,
            declaration,
            functionName,
            file
          );
          Object.defineProperty(this, propertyKey, {
            value: wrapped,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        },
      } as unknown as void;
    }
  } as {
    <T>(
      target: object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<(...args: TInput) => TOutput>
    ): TypedPropertyDescriptor<(...args: TInput) => TOutput> | void;
    (fn: (...args: TInput) => TOutput): (...args: TInput) => TOutput;
  };
}

/**
 * Gets the intent metadata from a decorated function.
 */
export function getIntentMetadata<TInput extends unknown[], TOutput>(
  fn: (...args: TInput) => TOutput
): IntentMetadata<TInput, TOutput> | undefined {
  return Reflect.getMetadata(INTENT_KEY, fn);
}

/**
 * Checks if a function has been decorated with @intent.
 */
export function hasIntent(fn: Function): boolean {
  return Reflect.hasMetadata(INTENT_KEY, fn);
}
