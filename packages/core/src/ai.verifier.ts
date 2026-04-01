/**
 * IFL AI Verifier
 * Verifies AI-generated code against intent declarations.
 */

import * as vm from 'node:vm';
import { runtimeMonitor } from './runtime.monitor.js';
import { safeSerialize } from './causal.tracer.js';
import type {
  IntentDeclaration,
  AIVerificationResult,
  StaticIssue,
  ViolationReport,
} from './types/index.js';

/**
 * Options for verifying AI-generated code.
 */
export interface VerifyCodeOptions {
  /** The generated code as a string */
  code: string;
  /** The intent declaration to verify against */
  intentDeclaration: IntentDeclaration<unknown[], unknown>;
  /** Name of the function to extract and test */
  functionName: string;
  /** Optional context description for better error messages */
  context?: string;
  /** Number of fuzz test runs (default: 100) */
  runs?: number;
}

/**
 * Verifies AI-generated code against intent declarations.
 * Uses static analysis and fuzz testing to ensure the code
 * satisfies the declared intent.
 */
export class AIVerifier {
  /**
   * Verifies generated code against an intent declaration.
   * 
   * @param options - Verification options including code and intent
   * @returns Verification result with pass/fail, violations, and recommendations
   */
  async verifyGeneratedCode(options: VerifyCodeOptions): Promise<AIVerificationResult> {
    const {
      code,
      intentDeclaration,
      functionName,
      runs = 100,
    } = options;

    // STEP 1: Static analysis
    const staticIssues = this.analyzeStatically(code, intentDeclaration);

    // STEP 2: Sandbox execution - extract the function
    const extractedFn = this.extractFunction(code, functionName);

    if (extractedFn === null) {
      return {
        passed: false,
        violations: [],
        staticIssues: [
          {
            type: 'other',
            description: 'Could not parse or execute the provided code',
            severity: 'error',
          },
        ],
        confidence: 0,
        recommendation: 'reject',
        reasoning: 'The provided code could not be executed in a safe sandbox.',
      };
    }

    // STEP 3: Fuzz testing
    let violations: ViolationReport[] = [];
    try {
      violations = await runtimeMonitor.fuzzTest(
        extractedFn as (...args: unknown[]) => unknown,
        intentDeclaration,
        { runs }
      );
    } catch (err) {
      // Fuzz testing itself failed
      staticIssues.push({
        type: 'other',
        description: `Fuzz testing failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }

    // STEP 4: Build result
    const hasStaticErrors = staticIssues.some(i => i.severity === 'error');
    const hasStaticWarnings = staticIssues.some(i => i.severity === 'warning');
    const passed = violations.length === 0 && !hasStaticErrors;

    // Determine recommendation
    let recommendation: AIVerificationResult['recommendation'];
    if (violations.length > 0 || hasStaticErrors) {
      recommendation = 'reject';
    } else if (hasStaticWarnings) {
      recommendation = 'review';
    } else {
      recommendation = 'accept';
    }

    // Calculate confidence
    let confidence = 1.0;
    confidence -= violations.length * 0.3;
    confidence -= staticIssues.filter(i => i.severity === 'error').length * 0.1;
    confidence -= staticIssues.filter(i => i.severity === 'warning').length * 0.05;
    confidence = Math.max(0, Math.min(1, confidence));

    // Build reasoning
    const reasoning = this.buildReasoning(
      violations,
      staticIssues,
      runs
    );

    return {
      passed,
      violations,
      staticIssues,
      confidence,
      recommendation,
      reasoning,
    };
  }

  /**
   * Performs static analysis on the code.
   * Uses simple text-based checks (no AST).
   */
  private analyzeStatically(
    code: string,
    declaration: IntentDeclaration<unknown[], unknown>
  ): StaticIssue[] {
    const issues: StaticIssue[] = [];

    // Check 1: Unchecked async
    // Function is async but contains no await
    if (code.includes('async') && !code.includes('await')) {
      issues.push({
        type: 'unchecked_async',
        description: 'Function is async but contains no await \u2014 may return unresolved Promise',
        severity: 'warning',
      });
    }

    // Check 2: Missing null check
    // Accesses array elements but has no precondition
    if (
      declaration.requires === undefined &&
      (code.includes('[0]') || code.includes('.length'))
    ) {
      issues.push({
        type: 'missing_null_check',
        description: 'Function accesses array elements but has no precondition guarding against null/empty input',
        severity: 'warning',
      });
    }

    // Check 3: Empty function body
    // Check for empty or near-empty function bodies
    const emptyBodyPatterns = [
      /\{\s*\}/,  // {}
      /\{\s{0,5}\}/,  // { } with up to 5 whitespace chars
      /=>\s*\{\s*\}/,  // arrow function with empty body
    ];

    const hasEmptyBody = emptyBodyPatterns.some(pattern => pattern.test(code));
    
    // Also check if function body has fewer than 5 non-whitespace chars
    const bodyMatch = code.match(/\{([^}]*)\}/);
    const hasNearEmptyBody = bodyMatch && 
      bodyMatch[1] !== undefined &&
      bodyMatch[1].replace(/\s/g, '').length < 5;

    if (hasEmptyBody || hasNearEmptyBody) {
      issues.push({
        type: 'other',
        description: 'Function body appears to be empty or near-empty',
        severity: 'error',
      });
    }

    // Check 4: Suspicious patterns
    if (code.includes('TODO') || code.includes('FIXME')) {
      issues.push({
        type: 'other',
        description: 'Code contains TODO or FIXME comments indicating incomplete implementation',
        severity: 'warning',
      });
    }

    // Check 5: Console statements in production code
    if (code.includes('console.log') || code.includes('console.debug')) {
      issues.push({
        type: 'other',
        description: 'Code contains console statements that should be removed for production',
        severity: 'info',
      });
    }

    return issues;
  }

  /**
   * Extracts a function from code by running it in a sandbox.
   * Returns null if extraction fails.
   */
  private extractFunction(code: string, functionName: string): Function | null {
    try {
      const sandbox: Record<string, unknown> = {
        // Provide minimal safe globals
        console: {
          log: () => {},
          warn: () => {},
          error: () => {},
        },
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        JSON,
        Map,
        Set,
        Promise,
        Error,
        TypeError,
        RangeError,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        undefined,
        NaN,
        Infinity,
      };

      vm.createContext(sandbox);

      // Run the code in the sandbox with a timeout
      vm.runInContext(code, sandbox, { timeout: 5000 });

      // Try to extract the function
      const fn = sandbox[functionName];

      if (typeof fn !== 'function') {
        // Maybe it's exported differently, try common patterns
        const moduleExports = sandbox['module'] as { exports?: Record<string, unknown> } | undefined;
        if (moduleExports?.exports && typeof moduleExports.exports[functionName] === 'function') {
          return moduleExports.exports[functionName] as Function;
        }

        const exports = sandbox['exports'] as Record<string, unknown> | undefined;
        if (exports && typeof exports[functionName] === 'function') {
          return exports[functionName] as Function;
        }

        return null;
      }

      return fn as Function;
    } catch {
      return null;
    }
  }

  /**
   * Builds a human-readable reasoning string.
   */
  private buildReasoning(
    violations: ViolationReport[],
    staticIssues: StaticIssue[],
    runs: number
  ): string {
    const parts: string[] = [];

    // Report static issues first
    if (staticIssues.length > 0) {
      const errorCount = staticIssues.filter(i => i.severity === 'error').length;
      const warningCount = staticIssues.filter(i => i.severity === 'warning').length;
      
      if (errorCount > 0 || warningCount > 0) {
        parts.push(
          `Static analysis found ${errorCount} error(s) and ${warningCount} warning(s) before runtime testing.`
        );
      }
    }

    // Report runtime violations
    if (violations.length === 0) {
      if (staticIssues.length === 0) {
        parts.push(
          `All ${runs} test inputs satisfied the declared intent. No static issues found.`
        );
      } else {
        parts.push(
          `All ${runs} test inputs satisfied the declared intent at runtime.`
        );
      }
    } else {
      const firstViolation = violations[0];
      const inputSummary = firstViolation 
        ? safeSerialize(firstViolation.input, 100)
        : 'unknown';

      parts.push(
        `The function failed the ${firstViolation?.violationType ?? 'postcondition'} on ${violations.length} of ${runs} test inputs.`
      );
      parts.push(`Most failing input: ${inputSummary}`);

      // Add suggested fix if available
      if (firstViolation?.suggestedFix) {
        parts.push(`Suggested fix: ${firstViolation.suggestedFix}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Quick check that returns just pass/fail without full details.
   * Useful for CI/CD pipelines.
   */
  async quickCheck(options: VerifyCodeOptions): Promise<boolean> {
    const result = await this.verifyGeneratedCode(options);
    return result.passed;
  }

  /**
   * Verifies multiple code snippets in parallel.
   */
  async verifyBatch(
    items: VerifyCodeOptions[]
  ): Promise<Map<string, AIVerificationResult>> {
    const results = new Map<string, AIVerificationResult>();

    const promises = items.map(async (item) => {
      const result = await this.verifyGeneratedCode(item);
      results.set(item.functionName, result);
    });

    await Promise.all(promises);
    return results;
  }
}

export const aiVerifier = new AIVerifier();
