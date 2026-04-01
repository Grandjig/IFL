/**
 * IFL Property Helpers Test Suite
 * Comprehensive tests for all property helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  // Array properties
  isSorted,
  sameElements,
  isUnique,
  hasLength,
  arrayIsNonEmpty,
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
} from '../properties/index.js';

// =============================================================================
// ARRAY PROPERTIES
// =============================================================================

describe('Array Properties', () => {
  describe('isSorted', () => {
    it('returns true for sorted array', () => {
      expect(isSorted([1, 2, 3])).toBe(true);
      expect(isSorted([1, 2, 3, 4, 5])).toBe(true);
      expect(isSorted([-3, -2, -1, 0, 1])).toBe(true);
    });

    it('returns true for single element', () => {
      expect(isSorted([1])).toBe(true);
      expect(isSorted([42])).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(isSorted([])).toBe(true);
    });

    it('returns false for unsorted array', () => {
      expect(isSorted([3, 1, 2])).toBe(false);
      expect(isSorted([1, 3, 2])).toBe(false);
      expect(isSorted([5, 4, 3, 2, 1])).toBe(false);
    });

    it('works with custom comparator', () => {
      // Descending order
      const desc = (a: unknown, b: unknown) => (b as number) - (a as number);
      expect(isSorted([3, 2, 1], desc)).toBe(true);
      expect(isSorted([1, 2, 3], desc)).toBe(false);
    });

    it('handles equal elements', () => {
      expect(isSorted([1, 1, 1])).toBe(true);
      expect(isSorted([1, 2, 2, 3])).toBe(true);
    });

    it('handles string arrays', () => {
      expect(isSorted(['a', 'b', 'c'])).toBe(true);
      expect(isSorted(['c', 'b', 'a'])).toBe(false);
    });
  });

  describe('sameElements', () => {
    it('returns true for same elements different order', () => {
      expect(sameElements([1, 2, 3], [3, 2, 1])).toBe(true);
      expect(sameElements([1, 2, 3], [2, 1, 3])).toBe(true);
    });

    it('returns true for identical arrays', () => {
      expect(sameElements([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(sameElements([], [])).toBe(true);
    });

    it('returns false when lengths differ', () => {
      expect(sameElements([1, 2, 3], [1, 2])).toBe(false);
      expect(sameElements([1], [1, 2])).toBe(false);
    });

    it('returns false when elements differ', () => {
      expect(sameElements([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(sameElements([1, 2, 3], [4, 5, 6])).toBe(false);
    });

    it('handles duplicates correctly', () => {
      expect(sameElements([1, 1, 2], [1, 2, 1])).toBe(true);
      expect(sameElements([1, 1, 2], [1, 2, 2])).toBe(false);
      expect(sameElements([1, 1, 1], [1, 1, 1])).toBe(true);
    });

    it('handles empty arrays', () => {
      expect(sameElements([], [])).toBe(true);
    });
  });

  describe('isUnique', () => {
    it('returns true for unique array', () => {
      expect(isUnique([1, 2, 3])).toBe(true);
      expect(isUnique(['a', 'b', 'c'])).toBe(true);
    });

    it('returns false for array with duplicates', () => {
      expect(isUnique([1, 2, 2, 3])).toBe(false);
      expect(isUnique([1, 1])).toBe(false);
      expect(isUnique(['a', 'a'])).toBe(false);
    });

    it('returns true for empty array', () => {
      expect(isUnique([])).toBe(true);
    });

    it('returns true for single element', () => {
      expect(isUnique([1])).toBe(true);
    });
  });

  describe('hasLength', () => {
    it('returns true for correct length', () => {
      expect(hasLength([1, 2, 3], 3)).toBe(true);
      expect(hasLength([], 0)).toBe(true);
    });

    it('returns false for incorrect length', () => {
      expect(hasLength([1, 2, 3], 2)).toBe(false);
      expect(hasLength([], 1)).toBe(false);
    });
  });

  describe('isNonEmpty (array)', () => {
    it('returns true for non-empty array', () => {
      expect(arrayIsNonEmpty([1])).toBe(true);
      expect(arrayIsNonEmpty([1, 2, 3])).toBe(true);
    });

    it('returns false for empty array', () => {
      expect(arrayIsNonEmpty([])).toBe(false);
    });
  });

  describe('containsAll', () => {
    it('returns true when all required elements present', () => {
      expect(containsAll([1, 2, 3, 4], [1, 2])).toBe(true);
      expect(containsAll([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('returns false when required element missing', () => {
      expect(containsAll([1, 2, 3], [4])).toBe(false);
      expect(containsAll([1, 2], [1, 2, 3])).toBe(false);
    });

    it('returns true for empty required array', () => {
      expect(containsAll([1, 2, 3], [])).toBe(true);
    });
  });

  describe('isSubsetOf', () => {
    it('returns true when array is subset', () => {
      expect(isSubsetOf([1, 2], [1, 2, 3])).toBe(true);
      expect(isSubsetOf([], [1, 2, 3])).toBe(true);
    });

    it('returns false when array has extra elements', () => {
      expect(isSubsetOf([1, 2, 4], [1, 2, 3])).toBe(false);
    });
  });

  describe('allMatch', () => {
    it('returns true when all elements match predicate', () => {
      expect(allMatch([2, 4, 6], (n) => (n as number) % 2 === 0)).toBe(true);
    });

    it('returns false when any element fails predicate', () => {
      expect(allMatch([2, 3, 6], (n) => (n as number) % 2 === 0)).toBe(false);
    });

    it('returns true for empty array', () => {
      expect(allMatch([], () => false)).toBe(true);
    });
  });

  describe('noneMatch', () => {
    it('returns true when no elements match predicate', () => {
      expect(noneMatch([1, 3, 5], (n) => (n as number) % 2 === 0)).toBe(true);
    });

    it('returns false when any element matches predicate', () => {
      expect(noneMatch([1, 2, 3], (n) => (n as number) % 2 === 0)).toBe(false);
    });

    it('returns true for empty array', () => {
      expect(noneMatch([], () => true)).toBe(true);
    });
  });

  describe('isSortedBy', () => {
    it('returns true for array sorted by key', () => {
      const arr = [{ age: 10 }, { age: 20 }, { age: 30 }];
      expect(isSortedBy(arr, 'age')).toBe(true);
    });

    it('returns false for array not sorted by key', () => {
      const arr = [{ age: 30 }, { age: 10 }, { age: 20 }];
      expect(isSortedBy(arr, 'age')).toBe(false);
    });

    it('returns true for single element', () => {
      expect(isSortedBy([{ x: 1 }], 'x')).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(isSortedBy([], 'x' as never)).toBe(true);
    });
  });
});

// =============================================================================
// STRING PROPERTIES
// =============================================================================

describe('String Properties', () => {
  describe('isEmail', () => {
    it('validates correct email', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name@domain.org')).toBe(true);
      expect(isEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('rejects missing @', () => {
      expect(isEmail('notanemail')).toBe(false);
      expect(isEmail('invalid.com')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isEmail('')).toBe(false);
    });

    it('rejects malformed emails', () => {
      expect(isEmail('@example.com')).toBe(false);
      expect(isEmail('user@')).toBe(false);
    });
  });

  describe('isUrl', () => {
    it('validates correct URLs', () => {
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('http://localhost:3000')).toBe(true);
      expect(isUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(isUrl('not a url')).toBe(false);
      expect(isUrl('')).toBe(false);
      expect(isUrl('example.com')).toBe(false);
    });
  });

  describe('isJson', () => {
    it('validates JSON object string', () => {
      expect(isJson('{"a":1}')).toBe(true);
      expect(isJson('{"name":"test","value":42}')).toBe(true);
    });

    it('validates JSON array string', () => {
      expect(isJson('[1,2,3]')).toBe(true);
      expect(isJson('[]')).toBe(true);
    });

    it('validates JSON primitives', () => {
      expect(isJson('"hello"')).toBe(true);
      expect(isJson('123')).toBe(true);
      expect(isJson('true')).toBe(true);
      expect(isJson('null')).toBe(true);
    });

    it('rejects plain text', () => {
      expect(isJson('hello')).toBe(false);
      expect(isJson('not json')).toBe(false);
    });

    it('rejects malformed JSON', () => {
      expect(isJson('{a:1}')).toBe(false);
      expect(isJson('{"a":}')).toBe(false);
    });
  });

  describe('isNonEmpty (string)', () => {
    it('returns true for non-empty string', () => {
      expect(stringIsNonEmpty('hello')).toBe(true);
      expect(stringIsNonEmpty(' ')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(stringIsNonEmpty('')).toBe(false);
    });
  });

  describe('hasMinLength', () => {
    it('returns true when meets minimum', () => {
      expect(hasMinLength('hello', 5)).toBe(true);
      expect(hasMinLength('hello', 3)).toBe(true);
    });

    it('returns false when below minimum', () => {
      expect(hasMinLength('hi', 5)).toBe(false);
      expect(hasMinLength('', 1)).toBe(false);
    });

    it('handles zero minimum', () => {
      expect(hasMinLength('', 0)).toBe(true);
    });
  });

  describe('hasMaxLength', () => {
    it('returns true when within maximum', () => {
      expect(hasMaxLength('hi', 5)).toBe(true);
      expect(hasMaxLength('hello', 5)).toBe(true);
    });

    it('returns false when exceeds maximum', () => {
      expect(hasMaxLength('hello world', 5)).toBe(false);
    });
  });

  describe('matches', () => {
    it('returns true when pattern matches', () => {
      expect(matches('hello123', /^[a-z]+\d+$/)).toBe(true);
    });

    it('returns false when pattern does not match', () => {
      expect(matches('hello', /^\d+$/)).toBe(false);
    });
  });

  describe('isOneOf', () => {
    it('returns true when string is in options', () => {
      expect(isOneOf('a', ['a', 'b', 'c'])).toBe(true);
    });

    it('returns false when string not in options', () => {
      expect(isOneOf('d', ['a', 'b', 'c'])).toBe(false);
    });
  });

  describe('containsSubstring', () => {
    it('returns true when substring present', () => {
      expect(containsSubstring('hello world', 'world')).toBe(true);
    });

    it('returns false when substring absent', () => {
      expect(containsSubstring('hello', 'world')).toBe(false);
    });
  });

  describe('isAlphanumeric', () => {
    it('returns true for alphanumeric strings', () => {
      expect(isAlphanumeric('abc123')).toBe(true);
      expect(isAlphanumeric('ABC')).toBe(true);
    });

    it('returns false for non-alphanumeric', () => {
      expect(isAlphanumeric('abc-123')).toBe(false);
      expect(isAlphanumeric('hello world')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isAlphanumeric('')).toBe(false);
    });
  });
});

// =============================================================================
// NUMBER PROPERTIES
// =============================================================================

describe('Number Properties', () => {
  describe('isPositive', () => {
    it('returns true for positive number', () => {
      expect(isPositive(1)).toBe(true);
      expect(isPositive(0.1)).toBe(true);
      expect(isPositive(100)).toBe(true);
    });

    it('returns false for zero', () => {
      expect(isPositive(0)).toBe(false);
    });

    it('returns false for negative', () => {
      expect(isPositive(-1)).toBe(false);
      expect(isPositive(-0.1)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isPositive(NaN)).toBe(false);
    });

    it('returns true for Infinity', () => {
      expect(isPositive(Infinity)).toBe(true);
    });

    it('returns false for negative Infinity', () => {
      expect(isPositive(-Infinity)).toBe(false);
    });
  });

  describe('isNegative', () => {
    it('returns true for negative number', () => {
      expect(isNegative(-1)).toBe(true);
      expect(isNegative(-0.1)).toBe(true);
    });

    it('returns false for zero', () => {
      expect(isNegative(0)).toBe(false);
    });

    it('returns false for positive', () => {
      expect(isNegative(1)).toBe(false);
    });
  });

  describe('isNonNegative', () => {
    it('returns true for positive', () => {
      expect(isNonNegative(1)).toBe(true);
    });

    it('returns true for zero', () => {
      expect(isNonNegative(0)).toBe(true);
    });

    it('returns false for negative', () => {
      expect(isNonNegative(-1)).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('returns true when in range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
      expect(isInRange(0.5, 0, 1)).toBe(true);
    });

    it('returns true for boundary values', () => {
      expect(isInRange(0, 0, 10)).toBe(true);
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    it('returns false outside range', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
      expect(isInRange(11, 0, 10)).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('returns true for integers', () => {
      expect(isInteger(1)).toBe(true);
      expect(isInteger(0)).toBe(true);
      expect(isInteger(-5)).toBe(true);
    });

    it('returns false for decimals', () => {
      expect(isInteger(1.5)).toBe(false);
      expect(isInteger(0.1)).toBe(false);
    });

    it('returns false for NaN and Infinity', () => {
      expect(isInteger(NaN)).toBe(false);
      expect(isInteger(Infinity)).toBe(false);
    });
  });

  describe('isFiniteNumber', () => {
    it('returns true for finite numbers', () => {
      expect(isFiniteNumber(1)).toBe(true);
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFiniteNumber(-1.5)).toBe(true);
    });

    it('returns false for Infinity', () => {
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFiniteNumber(-Infinity)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isFiniteNumber(NaN)).toBe(false);
    });
  });

  describe('isPercentage', () => {
    it('accepts 0 to 100', () => {
      expect(isPercentage(0)).toBe(true);
      expect(isPercentage(50)).toBe(true);
      expect(isPercentage(100)).toBe(true);
    });

    it('rejects outside 0-100', () => {
      expect(isPercentage(-1)).toBe(false);
      expect(isPercentage(101)).toBe(false);
    });
  });

  describe('isProportion', () => {
    it('accepts 0', () => {
      expect(isProportion(0)).toBe(true);
    });

    it('accepts 1', () => {
      expect(isProportion(1)).toBe(true);
    });

    it('accepts 0.5', () => {
      expect(isProportion(0.5)).toBe(true);
    });

    it('rejects 1.1', () => {
      expect(isProportion(1.1)).toBe(false);
    });

    it('rejects negative', () => {
      expect(isProportion(-0.1)).toBe(false);
    });
  });

  describe('isGreaterThan', () => {
    it('returns true when greater', () => {
      expect(isGreaterThan(5, 3)).toBe(true);
    });

    it('returns false when equal', () => {
      expect(isGreaterThan(3, 3)).toBe(false);
    });

    it('returns false when less', () => {
      expect(isGreaterThan(1, 3)).toBe(false);
    });
  });

  describe('isLessThan', () => {
    it('returns true when less', () => {
      expect(isLessThan(1, 3)).toBe(true);
    });

    it('returns false when equal', () => {
      expect(isLessThan(3, 3)).toBe(false);
    });

    it('returns false when greater', () => {
      expect(isLessThan(5, 3)).toBe(false);
    });
  });
});

// =============================================================================
// OBJECT PROPERTIES
// =============================================================================

describe('Object Properties', () => {
  describe('hasRequiredFields', () => {
    it('returns true when all fields present', () => {
      expect(hasRequiredFields({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
      expect(hasRequiredFields({ a: 1, b: 2, c: 3 }, ['a', 'b'])).toBe(true);
    });

    it('returns false when field missing', () => {
      expect(hasRequiredFields({ a: 1 }, ['a', 'b'])).toBe(false);
      expect(hasRequiredFields({}, ['a'])).toBe(false);
    });

    it('returns false for null input', () => {
      expect(hasRequiredFields(null, ['a'])).toBe(false);
    });

    it('returns false for undefined input', () => {
      expect(hasRequiredFields(undefined, ['a'])).toBe(false);
    });

    it('returns true for empty required fields', () => {
      expect(hasRequiredFields({}, [])).toBe(true);
    });
  });

  describe('hasNoExtraFields', () => {
    it('returns true when no extra fields', () => {
      expect(hasNoExtraFields({ a: 1 }, ['a', 'b'])).toBe(true);
      expect(hasNoExtraFields({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
    });

    it('returns false when extra fields present', () => {
      expect(hasNoExtraFields({ a: 1, c: 3 }, ['a', 'b'])).toBe(false);
    });

    it('returns false for null', () => {
      expect(hasNoExtraFields(null, ['a'])).toBe(false);
    });
  });

  describe('isNonNull', () => {
    it('returns true for object', () => {
      expect(isNonNull({})).toBe(true);
      expect(isNonNull({ a: 1 })).toBe(true);
      expect(isNonNull([])).toBe(true);
    });

    it('returns true for primitives', () => {
      expect(isNonNull(0)).toBe(true);
      expect(isNonNull('')).toBe(true);
      expect(isNonNull(false)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isNonNull(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isNonNull(undefined)).toBe(false);
    });
  });

  describe('isDeepEqual', () => {
    it('returns true for equal objects', () => {
      expect(isDeepEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it('returns false for different objects', () => {
      expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(isDeepEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it('handles nested objects', () => {
      expect(isDeepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
      expect(isDeepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    });

    it('handles arrays', () => {
      expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('handles primitives', () => {
      expect(isDeepEqual(1, 1)).toBe(true);
      expect(isDeepEqual('a', 'a')).toBe(true);
      expect(isDeepEqual(1, 2)).toBe(false);
    });

    it('handles null and undefined', () => {
      expect(isDeepEqual(null, null)).toBe(true);
      expect(isDeepEqual(undefined, undefined)).toBe(true);
      expect(isDeepEqual(null, undefined)).toBe(false);
    });
  });

  describe('isValidShape', () => {
    it('validates object shape', () => {
      const schema = { name: 'string', age: 'number' };
      expect(isValidShape({ name: 'John', age: 30 }, schema)).toBe(true);
    });

    it('rejects invalid shape', () => {
      const schema = { name: 'string', age: 'number' };
      expect(isValidShape({ name: 'John', age: '30' }, schema)).toBe(false);
    });

    it('rejects missing fields', () => {
      const schema = { name: 'string', age: 'number' };
      expect(isValidShape({ name: 'John' }, schema)).toBe(false);
    });

    it('validates arrays', () => {
      const schema = { items: 'array' };
      expect(isValidShape({ items: [1, 2, 3] }, schema)).toBe(true);
      expect(isValidShape({ items: 'not array' }, schema)).toBe(false);
    });

    it('validates booleans', () => {
      const schema = { active: 'boolean' };
      expect(isValidShape({ active: true }, schema)).toBe(true);
      expect(isValidShape({ active: 'true' }, schema)).toBe(false);
    });
  });

  describe('satisfiesAll', () => {
    it('returns true when all predicates pass', () => {
      const predicates = [
        (o: unknown) => (o as { a: number }).a > 0,
        (o: unknown) => (o as { b: number }).b > 0,
      ];
      expect(satisfiesAll({ a: 1, b: 2 }, predicates)).toBe(true);
    });

    it('returns false when any predicate fails', () => {
      const predicates = [
        (o: unknown) => (o as { a: number }).a > 0,
        (o: unknown) => (o as { b: number }).b > 0,
      ];
      expect(satisfiesAll({ a: 1, b: -1 }, predicates)).toBe(false);
    });

    it('returns true for empty predicates', () => {
      expect(satisfiesAll({}, [])).toBe(true);
    });
  });
});
