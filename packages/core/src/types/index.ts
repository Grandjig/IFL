/**
 * IFL Core Types
 * All TypeScript type definitions for the Intent-First Layer system.
 */

// =============================================================================
// VIOLATION TYPES
// =============================================================================

/**
 * The type of intent violation that occurred.
 */
export type ViolationType = 'precondition' | 'postcondition' | 'edge_case' | 'exception';

/**
 * A single step in the causal chain explaining how a violation occurred.
 */
export interface CausalStep {
  /** Step number in the trace sequence (1-indexed) */
  step: number;
  /** Human-readable description of what was checked or what happened */
  description: string;
  /** Whether this step passed (true) or failed (false) */
  passed: boolean;
  /** Optional value associated with this step for debugging */
  value?: unknown;
}

/**
 * Complete report of an intent violation.
 * Generated when runtime behavior doesn't match declared intent.
 */
export interface ViolationReport {
  /** Unique identifier (UUID v4) for this violation instance */
  id: string;
  /** When the violation occurred */
  timestamp: Date;
  /** Name of the function that violated its intent */
  functionName: string;
  /** File path where the function is defined */
  functionFile: string;
  /** Category of violation */
  violationType: ViolationType;
  /** Serialized form of the intent declaration that was violated */
  declaredIntent: string;
  /** The input arguments that triggered the violation */
  input: unknown[];
  /** What the function actually returned */
  actualOutput: unknown;
  /** What the function should have returned (for edge cases) */
  expectedOutput?: unknown;
  /** Step-by-step trace of the violation cause */
  causalChain: CausalStep[];
  /** Automatically generated fix suggestion */
  suggestedFix?: string;
  /** Confidence score (0-1) in the suggested fix */
  confidence: number;
  /** Stack trace at the point of violation */
  stackTrace: string;
}

// =============================================================================
// INTENT DECLARATION TYPES
// =============================================================================

/**
 * Handler for intent violations. Can be a preset string or custom function.
 */
export type ViolationHandler =
  | 'throw'
  | 'warn'
  | 'log'
  | ((violation: ViolationReport) => void);

/**
 * Edge case specification: when a specific condition is met,
 * the function must return a specific value.
 */
export interface EdgeCaseHandler<TInput extends unknown[], TOutput> {
  /** Predicate that identifies when this edge case applies */
  when: (...input: TInput) => boolean;
  /** Expected return value, or function to compute it */
  returns: TOutput | ((...input: TInput) => TOutput);
}

/**
 * Complete intent declaration for a function.
 * This is what developers write to specify what their function should do.
 *
 * @template TInput - Tuple type of function parameters
 * @template TOutput - Return type of the function
 */
export interface IntentDeclaration<TInput extends unknown[], TOutput> {
  /**
   * Postcondition: must return true for valid outputs.
   * Receives the input tuple and the output value.
   */
  ensures?: (input: TInput, output: TOutput) => boolean;

  /**
   * Precondition: must return true for valid inputs.
   * If false, the function shouldn't have been called with these inputs.
   */
  requires?: (...input: TInput) => boolean;

  /**
   * Edge case specifications: specific inputs that require specific outputs.
   */
  handles?: Array<EdgeCaseHandler<TInput, TOutput>>;

  /**
   * Human-readable description of what the function is intended to do.
   */
  description?: string;

  /**
   * Sampling rate for runtime checks (0-1).
   * Default: 1.0 in development, 0.01 in production.
   * Set to 0 to disable runtime checks entirely.
   */
  samplingRate?: number;

  /**
   * How to handle violations when they occur.
   * - 'throw': Throw IntentViolationError
   * - 'warn': console.warn (default in development)
   * - 'log': console.log (default in production)
   * - function: Custom handler
   */
  onViolation?: ViolationHandler;

  /**
   * Tags for filtering intents in CLI commands.
   * e.g., ['critical', 'payment', 'user-facing']
   */
  tags?: string[];
}

// =============================================================================
// REGISTRY TYPES
// =============================================================================

/**
 * A registered intent with metadata about its registration and violations.
 */
export interface RegisteredIntent {
  /** The intent declaration itself */
  declaration: IntentDeclaration<unknown[], unknown>;
  /** Name of the decorated function */
  functionName: string;
  /** File where the function is defined */
  file: string;
  /** When this intent was registered */
  registeredAt: Date;
  /** Number of violations detected for this intent */
  violationCount: number;
  /** Most recent violation, if any */
  lastViolation?: ViolationReport;
  /** Reference to the wrapped function */
  wrappedFunction?: unknown;
  /** Reference to the original unwrapped function */
  originalFunction?: unknown;
}

/**
 * Type alias for the intent registry map.
 */
export type IntentRegistryMap = Map<string, RegisteredIntent>;

// =============================================================================
// MONITORING TYPES
// =============================================================================

/**
 * Tracks the state of an active monitoring session.
 */
export interface MonitoringSession {
  /** When monitoring started */
  startedAt: Date;
  /** Total number of intent checks performed */
  totalChecks: number;
  /** Total number of violations detected */
  totalViolations: number;
  /** Current sampling rate */
  samplingRate: number;
  /** Whether monitoring is currently active */
  isActive: boolean;
}

// =============================================================================
// AI VERIFICATION TYPES
// =============================================================================

/**
 * Types of static analysis issues that can be detected.
 */
export type StaticIssueType =
  | 'missing_null_check'
  | 'unchecked_async'
  | 'type_mismatch'
  | 'unreachable_edge_case'
  | 'other';

/**
 * Severity levels for static issues.
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * A static analysis issue found in the code.
 */
export interface StaticIssue {
  /** Category of the issue */
  type: StaticIssueType;
  /** Human-readable description of the issue */
  description: string;
  /** Line number where the issue was found */
  line?: number;
  /** Column number where the issue was found */
  column?: number;
  /** Severity of the issue */
  severity: IssueSeverity;
}

/**
 * Result of AI-powered verification of code against intents.
 */
export interface AIVerificationResult {
  /** Whether all checks passed */
  passed: boolean;
  /** List of runtime violations found during fuzz testing */
  violations: ViolationReport[];
  /** List of static analysis issues found */
  staticIssues: StaticIssue[];
  /** Confidence score in the overall result (0-1) */
  confidence: number;
  /** Recommendation for how to proceed */
  recommendation: 'accept' | 'reject' | 'review';
  /** Explanation of the verification result */
  reasoning: string;
}

// =============================================================================
// FUZZ TESTING TYPES
// =============================================================================

/**
 * Options for fuzz testing a function.
 */
export interface FuzzTestOptions {
  /** Number of test iterations to run (default: 100) */
  runs?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Timeout per test in milliseconds */
  timeout?: number;
  /** Whether to continue after first failure */
  continueOnFailure?: boolean;
}

/**
 * Result of a fuzz test run.
 */
export interface FuzzTestResult {
  /** Function that was tested */
  functionName: string;
  /** Number of test iterations completed */
  runsCompleted: number;
  /** Number of violations found */
  violationsFound: number;
  /** All violation reports */
  violations: ViolationReport[];
  /** Time taken in milliseconds */
  duration: number;
  /** Seed used for this run (for reproducibility) */
  seed: number;
}

// =============================================================================
// DECORATOR METADATA TYPES
// =============================================================================

/**
 * Metadata key for storing intent declarations on functions.
 */
export const INTENT_METADATA_KEY = Symbol('ifl:intent');

/**
 * Metadata stored on a decorated function.
 */
export interface IntentMetadata<TInput extends unknown[], TOutput> {
  declaration: IntentDeclaration<TInput, TOutput>;
  file: string;
  functionName: string;
  isAsync: boolean;
  registeredAt: Date;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Extract the input tuple type from a function type.
 */
export type FunctionInputs<T> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Extract the output type from a function type.
 */
export type FunctionOutput<T> = T extends (...args: unknown[]) => infer R ? R : never;

/**
 * A function with an attached intent declaration.
 */
export interface IntentFunction<TInput extends unknown[], TOutput>
  extends Function {
  (...args: TInput): TOutput;
  __intent__?: IntentMetadata<TInput, TOutput>;
}

/**
 * Type for the intent decorator/wrapper function.
 * Works both as a decorator and as a higher-order function.
 */
export type IntentDecorator = <TInput extends unknown[], TOutput>(
  declaration: IntentDeclaration<TInput, TOutput>
) => {
  // Method decorator signature
  <T>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: TInput) => TOutput>
  ): TypedPropertyDescriptor<(...args: TInput) => TOutput> | void;

  // Function wrapper signature
  (fn: (...args: TInput) => TOutput): (...args: TInput) => TOutput;
};

// =============================================================================
// SERIALIZATION TYPES
// =============================================================================

/**
 * Options for safe serialization of values in violation reports.
 */
export interface SerializationOptions {
  /** Maximum depth for nested objects */
  maxDepth?: number;
  /** Maximum string length before truncation */
  maxStringLength?: number;
  /** Maximum array length before truncation */
  maxArrayLength?: number;
  /** Whether to include function source code */
  includeFunctionSource?: boolean;
}

/**
 * Result of serialization attempt.
 */
export interface SerializedValue {
  /** The serialized string representation */
  value: string;
  /** Whether the value was truncated */
  truncated: boolean;
  /** Original type of the value */
  originalType: string;
}
