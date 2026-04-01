/**
 * IFL Example: AI Code Verification
 * 
 * Demonstrates how to use the AIVerifier to verify AI-generated code
 * against intent declarations. This is the core workflow for integrating
 * IFL with AI coding assistants like Copilot, ChatGPT, or Claude.
 */

import { aiVerifier, isSorted, sameElements } from '@ifl/core';
import type { IntentDeclaration } from '@ifl/core';

(async () => {
  console.log('============================================================');
  console.log('IFL EXAMPLE: AI CODE VERIFICATION');
  console.log('============================================================');

  // ============================================================================
  // SHARED INTENT DECLARATION
  // ============================================================================
  // This is what a developer writes to specify what they want.
  // The AI generates the implementation, IFL verifies it matches.

  const sortIntent: IntentDeclaration<[number[]], number[]> = {
    description: 'Sorts an array of numbers in ascending order',
    requires: (arr) => Array.isArray(arr) && arr.every(item => typeof item === 'number'),
    ensures: (input, output) => isSorted(output) && sameElements(input[0], output),
    handles: [
      { when: (arr) => arr.length === 0, returns: [] },
    ],
  };

  // ============================================================================
  // TEST 1: Correct AI-generated implementation
  // ============================================================================
  // This is what good AI output looks like - it should pass verification.

  console.log('\n--- Test 1: Correct AI implementation ---');
  console.log('Code: function solution(arr) { return [...arr].sort((a, b) => a - b); }');

  const correctCode = `
    function solution(arr) {
      return [...arr].sort((a, b) => a - b);
    }
  `;

  const result1 = await aiVerifier.verifyGeneratedCode({
    code: correctCode,
    intentDeclaration: sortIntent,
    functionName: 'solution',
    runs: 100,
  });

  console.log('Recommendation:', result1.recommendation);
  console.log('Confidence:', Math.round(result1.confidence * 100) + '%');
  console.log('Reasoning:', result1.reasoning);

  // ============================================================================
  // TEST 2: Subtly broken AI implementation (lexicographic sort)
  // ============================================================================
  // This is a classic AI mistake: using sort() without a comparator.
  // Works for [1,2,3] but fails for [10,2,1] -> [1,10,2] (lexicographic)

  console.log('\n--- Test 2: Broken AI implementation (no comparator) ---');
  console.log('Code: function solution(arr) { return [...arr].sort(); }');
  console.log('Bug: sort() without comparator uses lexicographic order!');

  const brokenCode1 = `
    function solution(arr) {
      return [...arr].sort();
    }
  `;

  const result2 = await aiVerifier.verifyGeneratedCode({
    code: brokenCode1,
    intentDeclaration: sortIntent,
    functionName: 'solution',
    runs: 100,
  });

  console.log('Recommendation:', result2.recommendation);
  console.log('Confidence:', Math.round(result2.confidence * 100) + '%');
  console.log('Reasoning:', result2.reasoning);

  if (result2.violations.length > 0) {
    const firstViolation = result2.violations[0];
    if (firstViolation) {
      console.log('First failing input:', firstViolation.input);
      console.log('Got:', firstViolation.actualOutput);
      console.log('Suggested fix:', firstViolation.suggestedFix);
    }
  }

  // ============================================================================
  // TEST 3: AI implementation that drops duplicates
  // ============================================================================
  // A common AI mistake: using Set to "simplify" the sort, which loses duplicates.
  // [1,1,2] sorted with Set becomes [1,2], failing sameElements.

  console.log('\n--- Test 3: AI implementation that drops duplicates ---');
  console.log('Code: function solution(arr) { return [...new Set(arr)].sort((a, b) => a - b); }');
  console.log('Bug: Set removes duplicates \u2014 losing elements from output!');

  const brokenCode2 = `
    function solution(arr) {
      return [...new Set(arr)].sort((a, b) => a - b);
    }
  `;

  const strictSortIntent: IntentDeclaration<[number[]], number[]> = {
    description: 'Sorts array preserving all elements including duplicates',
    requires: (arr) => Array.isArray(arr) && arr.every(item => typeof item === 'number'),
    ensures: (input, output) => sameElements(input[0], output) && isSorted(output),
  };

  const result3 = await aiVerifier.verifyGeneratedCode({
    code: brokenCode2,
    intentDeclaration: strictSortIntent,
    functionName: 'solution',
    runs: 50,
  });

  console.log('Recommendation:', result3.recommendation);
  console.log('Reasoning:', result3.reasoning);

  // ============================================================================
  // TEST 4: Payment handler verification
  // ============================================================================
  // Real-world example: verifying an AI-generated payment handler.

  console.log('\n--- Test 4: Payment handler verification ---');

  const paymentIntent: IntentDeclaration<[any, any], any> = {
    description: 'Returns declined status for expired cards, completed otherwise',
    requires: (order, method) =>
      method !== null &&
      method !== undefined &&
      typeof method === 'object' &&
      !Array.isArray(method) &&
      'isExpired' in method &&
      typeof (method as any).isExpired === 'boolean',
    ensures: (input, output) => {
      const method = input[1] as any;
      const result = output as any;
      if (!result || typeof result !== 'object') return false;
      if (method.isExpired === true) return result.status === 'declined';
      if (method.isExpired === false) return result.status === 'completed';
      return false;
    },
  };

  const paymentCode = `
    function solution(order, paymentMethod) {
      if (paymentMethod && paymentMethod.isExpired) {
        return { status: 'declined', reason: 'card_expired' };
      }
      return { status: 'completed', transactionId: 'txn_' + Date.now() };
    }
  `;

  console.log('Code handles expired cards correctly:');
  console.log('  if (paymentMethod.isExpired) return { status: "declined" }');

  const result4 = await aiVerifier.verifyGeneratedCode({
    code: paymentCode,
    intentDeclaration: paymentIntent,
    functionName: 'solution',
    runs: 50,
  });

  console.log('Recommendation:', result4.recommendation);
  console.log('Confidence:', Math.round(result4.confidence * 100) + '%');

  // ============================================================================
  // TEST 5: Empty/invalid code detection
  // ============================================================================
  // AIVerifier should catch obviously broken or empty code.

  console.log('\n--- Test 5: Empty function body detection ---');

  const emptyCode = `
    function solution(arr) { }
  `;

  const result5 = await aiVerifier.verifyGeneratedCode({
    code: emptyCode,
    intentDeclaration: sortIntent,
    functionName: 'solution',
    runs: 10,
  });

  console.log('Code: function solution(arr) { }');
  console.log('Recommendation:', result5.recommendation);
  console.log('Static issues found:', result5.staticIssues.length);
  for (const issue of result5.staticIssues) {
    console.log(`  - [${issue.severity}] ${issue.description}`);
  }

  // ============================================================================
  // TEST 6: Async function without await (static analysis)
  // ============================================================================

  console.log('\n--- Test 6: Async function without await (static check) ---');

  const asyncNoAwait = `
    async function solution(arr) {
      return arr.sort((a, b) => a - b);
    }
  `;

  const result6 = await aiVerifier.verifyGeneratedCode({
    code: asyncNoAwait,
    intentDeclaration: sortIntent,
    functionName: 'solution',
    runs: 10,
  });

  console.log('Code: async function solution(arr) { return arr.sort(...); }');
  console.log('Recommendation:', result6.recommendation);
  if (result6.staticIssues.length > 0) {
    console.log('Static warnings:');
    for (const issue of result6.staticIssues) {
      console.log(`  - [${issue.severity}] ${issue.type}: ${issue.description}`);
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n============================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('============================================================');
  console.log('');
  console.log('Test 1 (Correct impl):      ', result1.recommendation.toUpperCase());
  console.log('Test 2 (No comparator):     ', result2.recommendation.toUpperCase());
  console.log('Test 3 (Drops duplicates):  ', result3.recommendation.toUpperCase());
  console.log('Test 4 (Payment handler):   ', result4.recommendation.toUpperCase());
  console.log('Test 5 (Empty body):        ', result5.recommendation.toUpperCase());
  console.log('Test 6 (Async no await):    ', result6.recommendation.toUpperCase());
  console.log('');
  console.log('============================================================');
  console.log('EXAMPLE COMPLETE');
  console.log('============================================================');
})();
