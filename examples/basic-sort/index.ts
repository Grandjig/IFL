/**
 * IFL Example: Basic Sort
 * 
 * Demonstrates:
 * 1. A correct sort function that passes intent verification
 * 2. A broken sort function that IFL catches (the 80/20 problem)
 * 3. An async function with intent verification
 * 4. Edge case handling
 */

import {
  intent,
  isSorted,
  sameElements,
} from '@ifl/core';

// ============================================================================
// EXAMPLE 1: Correct Implementation
// ============================================================================
// This sort function correctly handles all cases:
// - Uses spread to avoid mutating input
// - Uses proper numeric comparator
// - Handles empty arrays via edge case declaration

const sortNumbers = intent({
  description: 'Sorts numbers in ascending order',
  ensures: (input, output) => {
    const [arr] = input;
    return isSorted(output) && sameElements(arr as number[], output as number[]);
  },
  handles: [
    { when: (arr) => arr.length === 0, returns: [] },
    { when: (arr) => arr.length === 1, returns: (arr) => [...arr] },
  ],
  onViolation: 'warn',
  tags: ['sorting', 'correct'],
})((arr: number[]): number[] => {
  // Correct implementation:
  // - Uses spread to avoid mutation
  // - Uses (a - b) for numeric comparison
  return [...arr].sort((a, b) => a - b);
});

// ============================================================================
// EXAMPLE 2: Broken Implementation (80/20 Problem)
// ============================================================================
// This sort function has TWO bugs that IFL will catch:
// 1. It mutates the original array (no spread)
// 2. It uses default lexicographic sort (wrong for numbers)
//
// These bugs often pass manual testing because:
// - Small arrays like [1, 2, 3] sort correctly by accident
// - Testers don't always check if the original was mutated
//
// But IFL's postcondition check will catch it when given [10, 2, 1]
// because lexicographic sort produces [1, 10, 2] instead of [1, 2, 10]

const brokenSort = intent({
  description: 'Sorts numbers in ascending order (BROKEN)',
  ensures: (input, output) => {
    const [arr] = input;
    return isSorted(output) && sameElements(arr as number[], output as number[]);
  },
  onViolation: 'warn',
  tags: ['sorting', 'broken'],
})((arr: number[]): number[] => {
  // BUG 1: Mutates original array (no spread)
  // BUG 2: Default sort() is lexicographic, not numeric!
  // This will sort [10, 2, 1] as [1, 10, 2] instead of [1, 2, 10]
  return arr.sort();
});

// ============================================================================
// EXAMPLE 3: Async Function
// ============================================================================
// IFL correctly handles async functions by awaiting the result
// before checking postconditions.

const getUserName = intent({
  description: 'Fetches and returns user name as uppercase',
  ensures: (_input, output) => {
    return typeof output === 'string' && output === output.toUpperCase();
  },
  onViolation: 'warn',
  tags: ['async', 'correct'],
})(async (id: number): Promise<string> => {
  // Simulated async operation
  return Promise.resolve(`USER_${id}`.toUpperCase());
});

// ============================================================================
// EXAMPLE 4: Edge Cases
// ============================================================================
// This function declares specific edge cases that IFL verifies.

const findMax = intent({
  description: 'Finds the maximum number in an array',
  ensures: (input, output) => {
    const [arr] = input as [number[]];
    if (arr.length === 0) return output === undefined;
    return arr.every(n => n <= (output as number));
  },
  handles: [
    { when: (arr) => arr.length === 0, returns: undefined },
    { when: (arr) => arr.length === 1, returns: (arr) => arr[0] },
  ],
  onViolation: 'warn',
  tags: ['math', 'correct'],
})((arr: number[]): number | undefined => {
  if (arr.length === 0) return undefined;
  return Math.max(...arr);
});

// ============================================================================
// RUN EXAMPLES
// ============================================================================

(async () => {
  console.log('='.repeat(60));
  console.log('IFL EXAMPLE: BASIC SORT');
  console.log('='.repeat(60));

  console.log('\n--- Testing CORRECT sort ---');
  console.log('sortNumbers([3, 1, 4, 1, 5]):', sortNumbers([3, 1, 4, 1, 5]));
  console.log('sortNumbers([]):', sortNumbers([]));
  console.log('sortNumbers([42]):', sortNumbers([42]));
  console.log('sortNumbers([10, 2, 1]):', sortNumbers([10, 2, 1]));

  console.log('\n--- Testing BROKEN sort (should show violation) ---');
  // This will trigger a violation because:
  // - [10, 2, 1].sort() returns [1, 10, 2] (lexicographic)
  // - But isSorted([1, 10, 2]) is false (10 > 2)
  console.log('brokenSort([3, 1, 4]):', brokenSort([3, 1, 4]));
  console.log('brokenSort([10, 2, 1]):', brokenSort([10, 2, 1])); // This will violate!

  console.log('\n--- Testing async function ---');
  const name = await getUserName(42);
  console.log('getUserName(42):', name);

  console.log('\n--- Testing edge cases ---');
  console.log('findMax([3, 1, 4, 1, 5, 9]):', findMax([3, 1, 4, 1, 5, 9]));
  console.log('findMax([]):', findMax([]));
  console.log('findMax([42]):', findMax([42]));

  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE COMPLETE');
  console.log('='.repeat(60));
})();
