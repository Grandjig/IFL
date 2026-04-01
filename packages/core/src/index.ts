/**
 * IFL Core - Intent-First Layer
 * Runtime intent verification for JavaScript/TypeScript functions.
 */

import 'reflect-metadata';

// Main decorator and function wrapper
export { intent, getIntentMetadata, hasIntent } from './intent.decorator.js';

// Registry
export { intentRegistry, IntentRegistry } from './intent.registry.js';

// Runtime monitor
export { runtimeMonitor, RuntimeMonitor } from './runtime.monitor.js';

// Violation handling
export { violationReporter, ViolationReporter, IntentViolationError } from './violation.reporter.js';

// Causal tracing
export { causalTracer, CausalTracer, safeSerialize } from './causal.tracer.js';

// AI verification
export { aiVerifier, AIVerifier } from './ai.verifier.js';

// Property helpers - individual exports
export {
  // Array properties
  isSorted,
  sameElements,
  isUnique,
  hasLength,
  arrayIsNonEmpty,
  isArrayNonEmpty,
  containsAll,
  isSubsetOf,
  allMatch,
  noneMatch,
  isSortedBy,
  // Object properties
  hasRequiredFields,
  hasNoExtraFields,
  isDeepEqual,
  isNonNull,
  isValidShape,
  satisfiesAll,
  // String properties
  stringIsNonEmpty,
  isStringNonEmpty,
  hasMinLength,
  hasMaxLength,
  isEmail,
  isUrl,
  isJson,
  matches,
  isOneOf,
  containsSubstring,
  isAlphanumeric,
  // Number properties
  isPositive,
  isNegative,
  isNonNegative,
  isInRange,
  isInteger,
  isFiniteNumber,
  isPercentage,
  isProportion,
  isGreaterThan,
  isLessThan,
  // Namespaced access
  arrays,
  objects,
  strings,
  numbers,
} from './properties/index.js';

// All types
export type {
  IntentDeclaration,
  ViolationReport,
  ViolationType,
  CausalStep,
  RegisteredIntent,
  ViolationHandler,
  EdgeCaseHandler,
  MonitoringSession,
  AIVerificationResult,
  StaticIssue,
  StaticIssueType,
  IssueSeverity,
  FuzzTestOptions,
  FuzzTestResult,
  IntentMetadata,
  IntentFunction,
  IntentDecorator,
  FunctionInputs,
  FunctionOutput,
  IntentRegistryMap,
  SerializationOptions,
  SerializedValue,
} from './types/index.js';

export { INTENT_METADATA_KEY } from './types/index.js';
